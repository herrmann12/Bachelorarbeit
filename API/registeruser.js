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

        // Must use an admin to register a new user
        const provider = wallet.getProviderRegistry().getProvider(adminExists.type);
        const adminUser = await provider.getUserContext(adminExists, 'admin');

        // Check to see if we've already enrolled the user
        const userExists = await wallet.get('user1');
        if (userExists) {
            console.log('An identity for the user "user1" already exists in the wallet');
            return;
        }

        // Register the user, enroll the user, and import the new identity into the wallet
        const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: 'user1', role: 'client' }, adminUser);
        const enrollment = await ca.enroll({ enrollmentID: 'user1', enrollmentSecret: secret });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('user1', x509Identity);
        console.log('Successfully registered and enrolled user "user1" and imported it into the wallet');
    } catch (error) {
        console.error(`Failed to register user "user1": ${error}`);
        process.exit(1);
    }
}

main();
