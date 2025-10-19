(() => {
  const { ethers } = window;

  // ======================
  // DOM
  // ======================
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

  const walletPanel = document.getElementById('walletPanel');
  const sendPanel = document.getElementById('sendPanel');
  const addressEl = document.getElementById('address');
  const mnemonicEl = document.getElementById('mnemonic');
  const btnReveal = document.getElementById('btnReveal');
  const btnShowPK = document.getElementById('btnShowPK');
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
  const toast = document.getElementById('toast');

  let wallet = null;
  let pendingWallet = null;
  let reveal = true;

  // ======================
  // Toast
  // ======================
  function showToast(text){
    toast.textContent=text;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2000);
  }

  // ======================
  // Провайдер и баланс
  // ======================
  function getProvider(){
    return networkSelect.value==='ETH'
      ? ethers.getDefaultProvider()
      : new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  }

  async function fetchBalance(){
    if(!wallet) return;
    balanceEl.textContent='Загрузка...';
    try{
      const bal = await getProvider().getBalance(wallet.address);
      balanceEl.textContent = `${ethers.utils.formatEther(bal)} ${networkSelect.value}`;
    }catch{ balanceEl.textContent='Ошибка'; }
  }

  // ======================
  // Сохранение
  // ======================
  async function saveWallet(password){
    if(!wallet || !password) return;
    const json = await wallet.encrypt(password);
    localStorage.setItem('MiniWallet',json);
  }

  // ======================
  // Показ кошелька
  // ======================
  function setMnemonicVisible(flag){
    reveal = flag;
    if(!wallet) return;
    mnemonicEl.textContent = reveal ? wallet.mnemonic?.phrase || '—' : '•••••••• •••••••• ••••••••';
    btnReveal.textContent = reveal ? 'Скрыть seed' : 'Показать seed';
  }

  function showWallet(){
    walletPanel.hidden=false;
    startControls.hidden=true;
    passwordBlock.style.display='none';
    importBlock.style.display='none';
    addressEl.textContent=wallet.address;
    setMnemonicVisible(true);
    fetchBalance();
  }

  // ======================
  // Создание кошелька
  // ======================
  btnNew.addEventListener('click', ()=>{
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
    await saveWallet(pw1);
    showWallet();
  });

  // ======================
  // Импорт кошелька
  // ======================
  btnImport.addEventListener('click', ()=>{
    importBlock.style.display='block';
    passwordBlock.style.display='none';
  });
  btnImportCancel.addEventListener('click', ()=>{ importBlock.style.display='none'; });
  btnImportConfirm.addEventListener('click', ()=>{
    const phrase=importSeed.value.trim();
    if(!phrase) return alert('Введите seed-фразу!');
    try{
      pendingWallet=ethers.Wallet.fromMnemonic(phrase);
      importBlock.style.display='none';
      passwordBlock.style.display='block';
    }catch{ alert('Неверная seed-фраза!'); }
  });

  // ======================
  // Остальной функционал
  // ======================
  btnCopy.addEventListener('click', ()=>{
    if(!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    showToast('Адрес скопирован ✅');
  });
  btnShowPK.addEventListener('click', ()=>wallet?alert(wallet.privateKey):alert('Создайте кошелёк'));
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
  btnReveal.addEventListener('click', ()=>setMnemonicVisible(!reveal));

  btnSettings.addEventListener('click', ()=>settingsPanel.hidden=false);
  btnCloseSettings.addEventListener('click', ()=>settingsPanel.hidden=true);
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

  // ======================
  // Авторазблокировка
  // ======================
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
