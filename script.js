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
  const mnemonicEl = document.getElementById('mnemonic');
  const btnReveal = document.getElementById('btnReveal');
  const btnSend = document.getElementById('btnSend');
  const btnSendTx = document.getElementById('btnSendTx');
  const recipientInput = document.getElementById('recipient');
  const amountInput = document.getElementById('amount');
  const txResult = document.getElementById('txResult');
  const networkSelect = document.getElementById('networkSelect');
  const balanceEl = document.getElementById('balance');
  const btnCopy = document.getElementById('btnCopy');

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
  let reveal = true;

  // ===== Toast =====
  const showToast = (text) => {
    toast.textContent=text;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2000);
  };

  // ===== Provider =====
  const getProvider = ()=> networkSelect.value==='ETH'
    ? ethers.getDefaultProvider()
    : new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

  const fetchBalance = async ()=>{
    if(!wallet) return;
    try{
      const bal = await getProvider().getBalance(wallet.address);
      balanceEl.textContent = (bal.eq(0)?'Нету ничего':ethers.utils.formatEther(bal)+' '+networkSelect.value);
    }catch{ balanceEl.textContent='Нету ничего'; }
  };

  const saveWallet = async (password)=>{
    if(!wallet || !password) return;
    const json = await wallet.encrypt(password);
    localStorage.setItem('MiniWallet',json);
  };

  const setMnemonicVisible = (flag)=>{
    reveal = flag;
    if(!wallet) return;
    mnemonicEl.textContent = reveal ? wallet.mnemonic?.phrase || '—' : '•••••••• •••••••• ••••••••';
    btnReveal.textContent = reveal ? 'Скрыть seed' : 'Показать seed';
  };

  const showWallet = ()=>{
    loadingBlock.hidden = true;
    walletPanel.hidden = false;
    startControls.hidden = true;
    passwordBlock.style.display='none';
    importBlock.style.display='none';
    addressEl.textContent = wallet.address;
    setMnemonicVisible(true);
    fetchBalance();
  };

  // ===== Создать =====
  btnNew.addEventListener('click', ()=>{
    importBlock.style.display='none';
    pendingWallet = ethers.Wallet.createRandom();
    passwordBlock.style.display='block';
  });

  btnConfirmPassword.addEventListener('click', async ()=>{
    const pw1=newPassword.value.trim();
    const pw2=repeatPassword.value.trim();
    if(pw1.length<8)return alert('Пароль минимум 8 символов');
    if(pw1!==pw2)return alert('Пароли не совпадают!');
    wallet=pendingWallet;
    pendingWallet=null;
    loadingBlock.hidden=false;
    await saveWallet(pw1);
    showWallet();
  });

  // ===== Импорт =====
  btnImport.addEventListener('click', ()=>{
    passwordBlock.style.display='none';
    importBlock.style.display='block';
  });

  btnImportCancel.addEventListener('click', ()=>{ importBlock.style.display='none'; });

  btnImportConfirm.addEventListener('click', ()=>{
    const phrase = importSeed.value.trim();
    if(!phrase) return alert('Введите seed-фразу!');
    try{
      pendingWallet = ethers.Wallet.fromMnemonic(phrase);
      importBlock.style.display='none';
      passwordBlock.style.display='block';
    }catch{ alert('Неверная seed-фраза!'); }
  });

  // ===== Остальной функционал =====
  btnCopy.addEventListener('click', ()=>{
    if(!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    showToast('Адрес скопирован ✅');
  });

  btnSend.addEventListener('click', ()=>sendPanel.hidden=!sendPanel.hidden);

  btnSendTx.addEventListener('click', async ()=>{
    if(!wallet) return alert('Создайте кошелёк');
    const to=recipientInput.value.trim();
    const amount=amountInput.value.trim();
    if(!to||!amount)return alert('Заполните все поля');
    txResult.textContent='Отправка...';
    try{
      const w=wallet.connect(getProvider());
      const tx=await w.sendTransaction({to,value:ethers.utils.parseEther(amount)});
      txResult.textContent=`Отправлено! TxHash: ${tx.hash}`;
      fetchBalance();
    }catch{ txResult.textContent='Ошибка отправки'; }
  });

  networkSelect.addEventListener('change', fetchBalance);

  btnSettings.addEventListener('click', ()=>settingsPanel.hidden=false);
  btnCloseSettings.addEventListener('click', ()=>{ settingsPanel.hidden=true; secretDisplay.textContent=''; });

  btnLogout.addEventListener('click', ()=>{
    if(!confirm('Вы уверены?')) return;
    wallet=null;
    walletPanel.hidden=true;
    sendPanel.hidden=true;
    startControls.hidden=false;
    passwordBlock.style.display='none';
    importBlock.style.display='none';
    localStorage.removeItem('MiniWallet');
    showToast('Вы вышли из кошелька');
  });

  // ===== Seed и PK в настройки =====
  btnShowSeed.addEventListener('click', ()=>{
    const pw = prompt('Введите пароль чтобы показать seed:');
    if(!pw) return;
    const json = localStorage.getItem('MiniWallet');
    if(!json) return alert('Нет кошелька');
    ethers.Wallet.fromEncryptedJson(json,pw).then(w=>{
      secretDisplay.textContent = 'Seed: '+w.mnemonic?.phrase;
    }).catch(()=>alert('Неверный пароль'));
  });

  btnShowPK.addEventListener('click', ()=>{
    const pw = prompt('Введите пароль чтобы показать приватный ключ:');
    if(!pw) return;
    const json = localStorage.getItem('MiniWallet');
    if(!json) return alert('Нет кошелька');
    ethers.Wallet.fromEncryptedJson(json,pw).then(w=>{
      secretDisplay.textContent = 'Private Key: '+w.privateKey;
    }).catch(()=>alert('Неверный пароль'));
  });

  // ===== Авторазблокировка =====
  const savedWallet = localStorage.getItem('MiniWallet');
  if(savedWallet){
    const pw = prompt("Введите пароль для разблокировки кошелька:");
    if(pw){
      ethers.Wallet.fromEncryptedJson(savedWallet,pw).then(w=>{
        wallet=w;
        showWallet();
      }).catch(()=>alert('Неверный пароль'));
    }
  }
})();
