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
  const tokenSelect = document.getElementById('tokenSelect');
  const balanceEl = document.getElementById('tokenBalances');
  const btnCopy = document.getElementById('btnCopy');
  const btnMax = document.getElementById('btnMax');

  const btnSettings = document.getElementById('btnSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const btnLogout = document.getElementById('btnLogout');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnShowSeed = document.getElementById('btnShowSeed');
  const btnShowPK = document.getElementById('btnShowPK');
  const secretDisplay = document.getElementById('secretDisplay');

  const toast = document.getElementById('toast');

  let wallet = null;
  let walletMnemonic = null;
  let pendingWallet = null;
  let walletPassword = '';

  // ===== Лого токенов =====
  const tokenLogos = {
    BNB: 'img/bnb.png',
    USDT: 'img/usdt.png',
    USDC: 'img/usdc.png'
  };

  const tokenContracts = {
    USDT_BSC: '0x55d398326f99059fF775485246999027B3197955',
    USDC_BSC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  };

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

  // ===== Баланс =====
  const fetchBalance = async () => {
    if (!wallet) return;

    const provider = getProvider();
    const tokens = ['BNB', 'USDT', 'USDC'];
    const balances = [];

    for (let token of tokens) {
      try {
        let balText = '0';
        if (token === 'BNB') {
          const bal = await provider.getBalance(wallet.address);
          balText = bal.isZero() ? '0' : ethers.utils.formatEther(bal);
        } else {
          const contractKey = token + '_BSC';
          if (!tokenContracts[contractKey]) continue;

          const abi = [
            'function balanceOf(address) view returns (uint256)',
            'function decimals() view returns (uint8)'
          ];
          const contract = new ethers.Contract(tokenContracts[contractKey], abi, provider);
          const bal = await contract.balanceOf(wallet.address);
          const decimals = await contract.decimals();
          balText = bal.isZero() ? '0' : ethers.utils.formatUnits(bal, decimals);
        }

        balances.push({ token, amount: balText });
      } catch (e) {
        console.error(`Ошибка при получении баланса ${token}:`, e);
      }
    }

    // ===== Отображение баланса =====
    balanceEl.innerHTML = '';
    const networkLabel = networkSelect.value === 'ETH' ? 'ETH' : 'BNB';
    balances.forEach(({ token, amount }) => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '5px';
      div.innerHTML = `<img src="${tokenLogos[token]}" style="width:20px;height:20px;margin-right:8px;"> ${token}: ${amount} ${networkLabel}`;
      balanceEl.appendChild(div);
    });

    // ===== Заполнение select для отправки =====
    tokenSelect.innerHTML = '';
    balances.forEach(({ token }) => {
      const option = document.createElement('option');
      option.value = token;
      option.textContent = token;
      tokenSelect.appendChild(option);
    });
  };

  // ===== Кнопка Максимум =====
  btnMax.addEventListener('click', async () => {
    if (!wallet) return showToast('Сначала создайте кошелёк');

    const selectedToken = tokenSelect.value;
    const provider = getProvider();

    try {
      let maxAmount = '0';
      if (selectedToken === 'BNB') {
        const bal = await provider.getBalance(wallet.address);
        maxAmount = ethers.utils.formatEther(bal);
      } else {
        const contractKey = selectedToken + '_BSC';
        if (!tokenContracts[contractKey]) return showToast('Контракт токена не найден');

        const abi = [
          'function balanceOf(address) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ];
        const contract = new ethers.Contract(tokenContracts[contractKey], abi, provider);
        const bal = await contract.balanceOf(wallet.address);
        const decimals = await contract.decimals();
        maxAmount = ethers.utils.formatUnits(bal, decimals);
      }

      amountInput.value = maxAmount;
    } catch (e) {
      console.error('Ошибка при получении максимального баланса', e);
      showToast('Ошибка при получении максимального баланса');
    }
  });

  // ===== Сохранение сессии =====
  const saveSessionWallet = () => {
    if (!wallet) return;
    sessionStorage.setItem('MiniWalletSession', wallet.privateKey);
  };

  // ===== Отображение кошелька =====
  const showWallet = () => {
    loadingBlock.hidden = true;
    walletPanel.hidden = false;
    startControls.hidden = true;
    passwordBlock.style.display = 'none';
    importBlock.style.display = 'none';
    addressEl.textContent = wallet.address;
    fetchBalance();
    setInterval(fetchBalance, 10000);
  };

  // ===== Создание и импорт =====
  btnNew.addEventListener('click', () => {
    pendingWallet = ethers.Wallet.createRandom();
    walletMnemonic = pendingWallet.mnemonic.phrase;
    passwordBlock.style.display = 'block';
  });

  btnConfirmPassword.addEventListener('click', () => {
    const pw1 = newPassword.value.trim();
    const pw2 = repeatPassword.value.trim();
    if (pw1.length < 8) return alert('Пароль минимум 8 символов');
    if (pw1 !== pw2) return alert('Пароли не совпадают!');
    wallet = pendingWallet;
    pendingWallet = null;
    walletPassword = pw1;
    loadingBlock.hidden = false;
    saveSessionWallet();
    showWallet();
  });

  btnImport.addEventListener('click', () => {
    passwordBlock.style.display = 'none';
    importBlock.style.display = 'block';
  });

  btnImportCancel.addEventListener('click', () => { importBlock.style.display = 'none'; });

  btnImportConfirm.addEventListener('click', () => {
    const phrase = importSeed.value.trim();
    if (!phrase) return alert('Введите seed-фразу!');
    try {
      pendingWallet = ethers.Wallet.fromMnemonic(phrase);
      walletMnemonic = phrase;
      importBlock.style.display = 'none';
      passwordBlock.style.display = 'block';
    } catch {
      alert('Неверная seed-фраза!');
    }
  });

  // ===== Копирование адреса =====
  btnCopy.addEventListener('click', () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address).then(() => { showToast('✅ Адрес скопирован'); });
  });

  // ===== Переключение панели отправки =====
  btnSend.addEventListener('click', () => {
    if (!wallet) return alert('Создайте кошелёк');

    if (!settingsPanel.hidden) {
      settingsPanel.classList.add('animate-show');
      setTimeout(() => {
        settingsPanel.hidden = true;
        secretDisplay.textContent = '';
      }, 300);
    }

    if (sendPanel.hidden) {
      sendPanel.hidden = false;
      btnSend.classList.add('animate-btn','show');
      sendPanel.classList.add('animate-show');
    } else {
      sendPanel.classList.add('animate-show');
      setTimeout(() => {
        sendPanel.hidden = true;
        btnSend.classList.remove('show');
      }, 300);
    }
  });

  // ===== Переключение панели настроек =====
  btnSettings.addEventListener('click', () => {
    if (!sendPanel.hidden) {
      sendPanel.classList.add('animate-show');
      setTimeout(() => {
        sendPanel.hidden = true;
        btnSend.classList.remove('show');
      }, 300);
    }

    if (settingsPanel.hidden) {
      settingsPanel.hidden = false;
      settingsPanel.classList.add('animate-show');
    } else {
      settingsPanel.classList.add('animate-show');
      setTimeout(() => {
        settingsPanel.hidden = true;
        secretDisplay.textContent = '';
      }, 300);
    }
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsPanel.hidden = true;
    secretDisplay.textContent = '';
  });

  btnLogout.addEventListener('click', () => {
    if (!confirm('Вы уверены?')) return;
    wallet = null;
    walletMnemonic = null;
    sessionStorage.removeItem('MiniWalletSession');
    walletPanel.hidden = true;
    sendPanel.hidden = true;
    settingsPanel.hidden = true;
    startControls.hidden = false;
    passwordBlock.style.display = 'none';
    importBlock.style.display = 'none';
    showToast('Вы вышли из кошелька');
  });

  btnShowSeed.addEventListener('click', () => {
    if (!wallet) return alert('Нет кошелька');
    const pw = prompt('Введите пароль для просмотра Seed-фразы:');
    if (pw !== walletPassword) return alert('Неверный пароль!');
    secretDisplay.textContent = 'Seed: ' + walletMnemonic;
  });

  btnShowPK.addEventListener('click', () => {
    if (!wallet) return alert('Нет кошелька');
    const pw = prompt('Введите пароль для просмотра приватного ключа:');
    if (pw !== walletPassword) return alert('Неверный пароль!');
    secretDisplay.textContent = 'Private Key: ' + wallet.privateKey;
  });

  const sessionPK = sessionStorage.getItem('MiniWalletSession');
  if (sessionPK) {
    wallet = new ethers.Wallet(sessionPK);
    walletPassword = prompt('Введите пароль для авторазблокировки кошелька:');
    showWallet();
  }

})();
