'use strict';

const { Wallets, Gateway } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system-based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user
        const adminExists = await wallet.get('admin');
        if (!adminExists) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application before retrying');
            return;
        }

        // Check to see if we've already enrolled the user
        const userExists = await wallet.get('user1');
        if (userExists) {
            console.log('An identity for the user "user1" already exists in the wallet');
            return;
        }

        // Must use an admin to enroll the user
        const provider = wallet.getProviderRegistry().getProvider(adminExists.type);
        const adminUser = await provider.getUserContext(adminExists, 'admin');

        // Enroll the user, and import the new identity into the wallet
        const enrollment = await ca.enroll({ enrollmentID: 'user1', enrollmentSecret: 'user1pw' }); // Geheime Schlüssel entsprechend der Konfiguration
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('user1', x509Identity);
        console.log(`Successfully enrolled user "user1" and imported it into the wallet`);
    } catch (error) {
        console.error(`Failed to enroll user "user1": ${error}`);
        process.exit(1);
    }
}

main();
