const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Load the network configuration
const ccpPath = path.resolve(__dirname, 'connection.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// Function to get product details from the ledger
async function getProductDetails(productId) {
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'user1', // Verwenden Sie die eingeschriebene Identität 'user1'
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel'); // Stellen Sie sicher, dass der Kanalname korrekt ist
    const contract = network.getContract('mycontract'); // Ersetzen Sie 'mycontract' durch den Namen Ihres Smart Contracts

    const result = await contract.evaluateTransaction('queryProduct', productId);
    await gateway.disconnect();

    return JSON.parse(result.toString());
}

app.get('/api/product/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        const productDetails = await getProductDetails(productId);
        res.json(productDetails);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
});
