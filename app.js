let web3;
let html5QrCode;
let selectedWallet = null;
let isPhone = false;

document.addEventListener('DOMContentLoaded', () => {
  detectDevice();
  
  const walletSelector = document.getElementById('walletSelector');
  const connectWalletButton = document.getElementById('connectWalletButton');
  const disconnectButton = document.getElementById('disconnectButton');
  const sendButton = document.getElementById('sendButton');
  const taxiButton = document.getElementById('taxiButton');
  const passengerButton = document.getElementById('passengerButton');
  const scanQRButton = document.getElementById('scanQRButton');

  walletSelector.addEventListener('change', (event) => {
    selectedWallet = event.target.value;
    connectWalletButton.disabled = false;
  });

  connectWalletButton.addEventListener('click', connectWallet);
  disconnectButton.addEventListener('click', disconnectWallet);
  sendButton.addEventListener('click', sendPayment);
  taxiButton.addEventListener('click', showTaxiQRCode);
  passengerButton.addEventListener('click', showPassengerInfo);
  if (scanQRButton) {
    scanQRButton.addEventListener('click', startQRScanner);
  }
});

function detectDevice() {
  isPhone = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const walletSelector = document.getElementById('walletSelector');
  if (isPhone) {
    // Remove Celo Extension Wallet option for phones
    const celoOption = walletSelector.querySelector('option[value="celo"]');
    if (celoOption) {
      celoOption.remove();
    }
    // Hide QR scanner button for phones (assuming it won't work in most mobile browsers)
    const scanQRButton = document.getElementById('scanQRButton');
    if (scanQRButton) {
      scanQRButton.style.display = 'none';
    }
  } else {
    // Remove WalletConnect option for PCs
    const walletConnectOption = walletSelector.querySelector('option[value="walletconnect"]');
    if (walletConnectOption) {
      walletConnectOption.remove();
    }
  }
}

async function connectWallet() {
  try {
    if (selectedWallet === 'celo' && !isPhone) {
      await connectCeloWallet();
    } else if (selectedWallet === 'walletconnect' && isPhone) {
      await connectWalletConnect();
    }
  } catch (error) {
    console.error('Error in connectWallet:', error);
    document.getElementById('status').innerText = 'Error connecting to wallet: ' + error.message;
  }
}

async function connectCeloWallet() {
  if (window.celo) {
    try {
      await window.celo.enable();
      web3 = new Web3(window.celo);
      await setupWallet(web3);
    } catch (error) {
      console.error('Error connecting to Celo wallet:', error);
      document.getElementById('status').innerText = 'Error connecting to Celo wallet: ' + error.message;
    }
  } else {
    alert('Please install the Celo Extension Wallet.');
  }
}

async function connectWalletConnect() {
  const WalletConnectProvider = window.WalletConnectProvider.default;
  const provider = new WalletConnectProvider({
    rpc: {
      42220: 'https://forno.celo.org', // Celo Mainnet
      44787: 'https://alfajores-forno.celo-testnet.org' // Celo Testnet (Alfajores)
    },
    chainId: 42220, // Use 44787 for Alfajores testnet
  });

  try {
    await provider.enable();
    web3 = new Web3(provider);
    await setupWallet(web3);
  } catch (error) {
    console.error('Error connecting with WalletConnect:', error);
    document.getElementById('status').innerText = 'Error connecting with WalletConnect: ' + error.message;
  }

  // Subscribe to account change events
  provider.on("accountsChanged", (accounts) => {
    console.log('Account changed:', accounts[0]);
    setupWallet(web3);
  });

  // Subscribe to chain change events
  provider.on("chainChanged", (chainId) => {
    console.log('Chain changed:', chainId);
    setupWallet(web3);
  });

  // Subscribe to disconnect events
  provider.on("disconnect", (code, reason) => {
    console.log('Disconnected:', code, reason);
    disconnectWallet();
  });
}

async function setupWallet(web3Instance) {
  try {
    const accounts = await web3Instance.eth.getAccounts();
    const account = accounts[0];

    document.getElementById('status').innerText = `Connected`;
    document.getElementById('account').innerText = account;
    document.getElementById('accountInfo').style.display = 'block';
    document.getElementById('walletSelection').style.display = 'none';
    document.getElementById('disconnectButton').style.display = 'inline-block';
    document.getElementById('roleSelection').style.display = 'block';

    const balance = await web3Instance.eth.getBalance(account);
    document.getElementById('balance').innerText = web3Instance.utils.fromWei(balance, 'ether');
  } catch (error) {
    console.error('Error in setupWallet:', error);
    document.getElementById('status').innerText = 'Error setting up wallet: ' + error.message;
  }
}

function disconnectWallet() {
  if (web3 && web3.currentProvider && web3.currentProvider.disconnect) {
    web3.currentProvider.disconnect();
  }

  web3 = null;
  selectedWallet = null;
  document.getElementById('status').innerText = 'Not connected';
  document.getElementById('account').innerText = '';
  document.getElementById('balance').innerText = '';
  document.getElementById('accountInfo').style.display = 'none';
  document.getElementById('roleSelection').style.display = 'none';
  document.getElementById('taxiInfo').style.display = 'none';
  document.getElementById('passengerInfo').style.display = 'none';
  document.getElementById('walletSelection').style.display = 'block';
  document.getElementById('disconnectButton').style.display = 'none';
  document.getElementById('walletSelector').value = '';
  document.getElementById('connectWalletButton').disabled = true;
}

function showTaxiQRCode() {
  const account = document.getElementById('account').innerText;
  const qr = qrcode(0, 'M');
  qr.addData(account);
  qr.make();
  document.getElementById('qrcode').innerHTML = qr.createImgTag(5);
  document.getElementById('taxiInfo').style.display = 'block';
  document.getElementById('passengerInfo').style.display = 'none';
}

function showPassengerInfo() {
  document.getElementById('passengerInfo').style.display = 'block';
  document.getElementById('taxiInfo').style.display = 'none';
  showRouteOptions();
}

function startQRScanner() {
  const qrReader = document.getElementById('qrReader');
  qrReader.style.display = 'block';
  
  html5QrCode = new Html5Qrcode("qrReader");
  html5QrCode.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    },
    onScanSuccess,
    onScanFailure
  );
}

function onScanSuccess(decodedText, decodedResult) {
  html5QrCode.stop();
  document.getElementById('qrReader').style.display = 'none';
  document.getElementById('recipient').value = decodedText;
  showRouteOptions();
}

function onScanFailure(error) {
  console.warn(`QR code scanning failed: ${error}`);
}

async function sendPayment() {
  const recipient = document.getElementById('recipient').value;
  const amount = document.getElementById('amount').value;
  const account = document.getElementById('account').innerText;

  if (web3 && account) {
    try {
      await web3.eth.sendTransaction({
        from: account,
        to: recipient,
        value: web3.utils.toWei(amount, 'ether'),
      });
      alert('Payment sent successfully!');
    } catch (error) {
      console.error('Error sending payment:', error);
      alert('Error sending payment.');
    }
  } else {
    alert('Wallet not connected.');
  }
}

function showRouteOptions() {
  const routes = [
    { from: 'Wynberg', to: 'Claremont', price: 0.05 },
    { from: 'Wynberg', to: 'Rondebosch', price: 0.075 },
    { from: 'Wynberg', to: 'Observatory', price: 0.08 },
    { from: 'Wynberg', to: 'Cape Town', price: 0.1 }
  ];

  const routeOptionsHtml = routes.map(route => `
    <button class="route-option" data-from="${route.from}" data-to="${route.to}" data-price="${route.price}">
      ${route.from} to ${route.to} (${route.price} CELO)
    </button>
  `).join('');

  const routeOptionsDiv = document.createElement('div');
  routeOptionsDiv.id = 'routeOptions';
  routeOptionsDiv.innerHTML = routeOptionsHtml;

  document.getElementById('passengerInfo').appendChild(routeOptionsDiv);

  routeOptionsDiv.querySelectorAll('.route-option').forEach(button => {
    button.addEventListener('click', () => {
      const from = button.dataset.from;
      const to = button.dataset.to;
      const price = button.dataset.price;
      document.getElementById('route').innerText = `${from} to ${to}`;
      document.getElementById('amount').value = price;
    });
  });
}
