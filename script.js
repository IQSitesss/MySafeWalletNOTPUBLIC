(() => {
  const { ethers } = window;

  // ===== DOM =====
  const btnNew = document.getElementById('btnNew');
  const btnImport = document.getElementById('btnImport');
  const startControls = document.getElementById('startControls');
  const passwordBlock = document.getElementById('passwordBlock');
  const newPassword = document.getElementById('newPassword');
  const repeatPassword = document.getElementById('repeatPassword');
  const btnConfirmPassword = document.getElementById('btnConfirmPassword');
  const importBlock = document.getElementById('importBlock');
  const importSeed = document.getElementById('importSeed');
  const btnImportConfirm = document.getElementById('btnImportConfirm');
  const btnImportCancel = document.getElementById('btnImportCancel');
  const loadingBlock = document.getElementById('loadingBlock');

  const walletPanel = document.getElementById('walletPanel');
  const sendPanel = document.getElementById('sendPanel');
  const addressEl = document.getElementById('address');
  const btnSend = document.getElementById('btnSend');
  const btnSendTx = document.getElementById('btnSendTx');
  const recipientInput = document.getElementById('recipient');
  const amountInput = document.getElementById('amount');
  const txResult = document.getElementById('txResult');
  const networkSelect = document.getElementById('networkSelect');
  const balanceEl = document.getElementById('balance');
  const btnCopy = document.getElementById('btnCopy');
  const tokenSelect = document.getElementById('tokenSelect');

  const btnSettings = document.getElementById('btnSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const btnLogout = document.getElementById('btnLogout');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnShowSeed = document.getElementById('btnShowSeed');
  const btnShowPK = document.getElementById('btnShowPK');
  const secretDisplay = document.getElementById('secretDisplay');

  const toast = document.getElementById('toast');

  let wallet = null;
  let pendingWallet = null;
  let walletPassword = '';

  // ===== Toast =====
  const showToast = (text) => {
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  };

  // ===== Provider =====
  const getProvider = () =>
    networkSelect.value === 'ETH'
      ? ethers.getDefaultProvider()
      : new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

  // ===== ERC20/BEP20 токены =====
  const tokenContracts = {
    USDT_BSC: '0x55d398326f99059fF775485246999027B3197955',
    USDC_BSC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  };

  // ===== Баланс =====
  const fetchBalance = async () => {
    if (!wallet) return;
    try {
      const token = tokenSelect.value;
      const provider = getProvider();
      if (token === 'BNB' || token === 'ETH') {
        const bal = await provider.getBalance(wallet.address);
        balanceEl.textContent = bal.eq(0) ? 'Нету ничего' : ethers.utils.formatEther(bal) + ' ' + token;
      } else {
        const abi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
        const contract = new ethers.Contract(tokenContracts[token + '_BSC'], abi, provider);
        const bal = await contract.balanceOf(wallet.address);
        const decimals = await contract.decimals();
        balanceEl.textContent = bal.eq(0) ? 'Нету ничего' : ethers.utils.formatUnits(bal, decimals) + ' ' + token;
      }
    } catch {
      balanceEl.textContent = 'Нету ничего';
    }
  };

  // ===== Сохранение кошелька =====
  const saveWallet = async (password) => {
    if (!wallet || !password) return;
    walletPassword = password;
    const json = await wallet.encrypt(password);
    localStorage.setItem('MiniWallet', json);
  };

  // ===== Отображение кошелька =====
  const showWallet = () => {
    loadingBlock.hidden = true;
    walletPanel.hidden = false;
    startControls.hidden = true;
    passwordBlock.style.display = 'none';
    importBlock.style.display = 'none';
    addressEl.textContent = wallet.address;

    tokenSelect.innerHTML = '';
    const options = ['BNB', 'USDT', 'USDC'];
    options.forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      tokenSelect.appendChild(o);
    });

    fetchBalance();
    setInterval(fetchBalance, 10000);
  };

  // ===== Создание нового кошелька =====
  btnNew.addEventListener('click', () => {
    importBlock.style.display = 'none';
    passwordBlock.style.display = 'block';
    pendingWallet = ethers.Wallet.createRandom();
  });

  btnConfirmPassword.addEventListener('click', async () => {
    const pw1 = newPassword.value.trim();
    const pw2 = repeatPassword.value.trim();
    if (pw1.length < 8) return alert('Пароль минимум 8 символов');
    if (pw1 !== pw2) return alert('Пароли не совпадают!');
    wallet = pendingWallet;
    pendingWallet = null;
    loadingBlock.hidden = false;
    await saveWallet(pw1);
    showWallet();
  });

  // ===== Импорт кошелька =====
  btnImport.addEventListener('click', () => {
    passwordBlock.style.display = 'none';
    importBlock.style.display = 'block';
  });

  btnImportCancel.addEventListener('click', () => {
    importBlock.style.display = 'none';
  });

  btnImportConfirm.addEventListener('click', () => {
    const phrase = importSeed.value.trim();
    if (!phrase) return alert('Введите seed-фразу!');
    try {
      pendingWallet = ethers.Wallet.fromMnemonic(phrase);
      importBlock.style.display = 'none';
      passwordBlock.style.display = 'block';
    } catch {
      alert('Неверная seed-фраза!');
    }
  });

  // ===== Копирование адреса =====
  btnCopy.addEventListener('click', () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address).then(() => {
      showToast(`Адрес ${wallet.address} скопирован ✅`);
    });
  });

  // ===== Показ панели отправки =====
  btnSend.addEventListener('click', () => {
    if (!wallet) return alert('Создайте кошелёк');
    sendPanel.hidden = !sendPanel.hidden;
  });

  // ===== Отправка транзакций =====
  btnSendTx.addEventListener('click', async () => {
    if (!wallet) return alert('Создайте кошелёк');
    const to = recipientInput.value.trim();
    const amount = amountInput.value.trim();
    if (!to || !amount) return alert('Заполните все поля');
    txResult.textContent = 'Отправка...';
    try {
      const provider = getProvider();
      const w = wallet.connect(provider);
      const token = tokenSelect.value;

      if (token === 'BNB' || token === 'ETH') {
        const tx = await w.sendTransaction({ to, value: ethers.utils.parseEther(amount) });
        await tx.wait();
        txResult.textContent = `Отправлено! TxHash: ${tx.hash}`;
      } else {
        const abi = ['function transfer(address to,uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];
        const contract = new ethers.Contract(tokenContracts[token + '_BSC'], abi, w);
        const decimals = await contract.decimals();
        const bigAmount = ethers.utils.parseUnits(amount, decimals);
        const tx = await contract.transfer(to, bigAmount);
        await tx.wait();
        txResult.textContent = `Отправлено! TxHash: ${tx.hash}`;
      }

      fetchBalance();
    } catch (e) {
      console.error(e);
      txResult.textContent = 'Ошибка отправки';
    }
  });

  networkSelect.addEventListener('change', fetchBalance);
  tokenSelect.addEventListener('change', fetchBalance);

  // ===== Настройки =====
  btnSettings.addEventListener('click', () => (settingsPanel.hidden = false));
  btnCloseSettings.addEventListener('click', () => {
    settingsPanel.hidden = true;
    secretDisplay.textContent = '';
  });

  btnLogout.addEventListener('click', () => {
    if (!confirm('Вы уверены?')) return;
    wallet = null;
    walletPanel.hidden = true;
    sendPanel.hidden = true;
    settingsPanel.hidden = true;
    startControls.hidden = false;
    passwordBlock.style.display = 'none';
    importBlock.style.display = 'none';
    localStorage.removeItem('MiniWallet');
    showToast('Вы вышли из кошелька');
  });

  btnShowSeed.addEventListener('click', () => {
    const pw = prompt('Введите пароль чтобы показать seed:');
    if (!pw) return;
    const json = localStorage.getItem('MiniWallet');
    if (!json) return alert('Нет кошелька');
    ethers.Wallet.fromEncryptedJson(json, pw)
      .then((w) => {
        secretDisplay.textContent = 'Seed: ' + w.mnemonic?.phrase;
      })
      .catch(() => alert('Неверный пароль'));
  });

  btnShowPK.addEventListener('click', () => {
    const pw = prompt('Введите пароль чтобы показать приватный ключ:');
    if (!pw) return;
    const json = localStorage.getItem('MiniWallet');
    if (!json) return alert('Нет кошелька');
    ethers.Wallet.fromEncryptedJson(json, pw)
      .then((w) => {
        secretDisplay.textContent = 'Private Key: ' + w.privateKey;
      })
      .catch(() => alert('Неверный пароль'));
  });

  // ===== Авторазблокировка =====
  const savedWallet = localStorage.getItem('MiniWallet');
  if (savedWallet) {
    const pw = prompt('Введите пароль для авторазблокировки кошелька:');
    if (pw) {
      ethers.Wallet.fromEncryptedJson(savedWallet, pw)
        .then((w) => {
          wallet = w;
          walletPassword = pw;
          showWallet();
        })
        .catch(() => console.log('Неверный пароль для авторазблокировки'));
    }
  }
})();