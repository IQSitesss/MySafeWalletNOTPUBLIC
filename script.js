(() => {
const { ethers } = window;

// Элементы
const btnNew = document.getElementById('btnNew');
const btnImport = document.getElementById('btnImport');
const walletPanel = document.getElementById('walletPanel');
const addressEl = document.getElementById('address');
const mnemonicEl = document.getElementById('mnemonic');
const btnReveal = document.getElementById('btnReveal');
const btnSend = document.getElementById('btnSend');
const sendPanel = document.getElementById('sendPanel');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const btnSendTx = document.getElementById('btnSendTx');
const txResult = document.getElementById('txResult');
const balanceEl = document.getElementById('balance');

const btnSettings = document.getElementById('btnSettings');
const settingsPanel = document.getElementById('settingsPanel');
const btnShowPK = document.getElementById('btnShowPK');
const btnLogout = document.getElementById('btnLogout');
const btnCloseSettings = document.getElementById('btnCloseSettings');

const importModal = document.getElementById('importModal');
const importSeed = document.getElementById('importSeed');
const btnImportConfirm = document.getElementById('btnImportConfirm');
const btnImportCancel = document.getElementById('btnImportCancel');

let wallet = null;
let reveal = false;

// ======= Функции =======
function setMnemonicVisible(flag){
  reveal = flag;
  if(!wallet) return;
  mnemonicEl.textContent = reveal ? wallet.mnemonic?.phrase || '—' : '•••••••• •••••••• ••••••••';
  btnReveal.textContent = reveal ? 'Скрыть seed' : 'Показать seed';
}

function getProvider(){
  return ethers.getDefaultProvider();
}

async function fetchTokens() {
  if(!wallet) return;
  balanceEl.textContent = 'Загрузка...';
  try{
    const tokens = [
      {name:'ETH', balance:1.23, usd:1850, logo:'https://cryptologos.cc/logos/ethereum-eth-logo.png'},
      {name:'USDT', balance:50, usd:50, logo:'https://cryptologos.cc/logos/tether-usdt-logo.png'},
      {name:'BNB', balance:0.5, usd:90, logo:'https://cryptologos.cc/logos/bnb-bnb-logo.png'}
    ].filter(t=>t.usd>0.03);
    balanceEl.innerHTML = '';
    tokens.forEach(t=>{
      const div = document.createElement('div');
      div.className = 'tokenItem';
      const img = document.createElement('img'); img.src=t.logo;
      const span = document.createElement('span'); span.textContent = `${t.balance} ${t.name} (~$${t.usd.toFixed(2)})`;
      div.appendChild(img); div.appendChild(span);
      balanceEl.appendChild(div);
    });
  }catch(e){ console.error(e); balanceEl.textContent='Ошибка получения баланса'; }
}

function showWallet(){
  walletPanel.hidden = false;
  addressEl.textContent = wallet.address;
  setMnemonicVisible(false);
  fetchTokens();
  btnNew.style.display='none';
  btnImport.style.display='none';
}

function createWallet(){
  wallet = ethers.Wallet.createRandom();
  showWallet();
}

// ======= События =======
btnNew.addEventListener('click', createWallet);

btnImport.addEventListener('click', ()=>{
  importModal.hidden=false;
});

btnImportCancel.addEventListener('click', ()=> importModal.hidden=true);

btnImportConfirm.addEventListener('click', ()=>{
  try{
    const phrase = importSeed.value.trim();
    if(!phrase) return alert('Введите seed-фразу!');
    wallet = ethers.Wallet.fromMnemonic(phrase);
    importModal.hidden=true;
    showWallet();
  }catch(e){ alert('Некорректная seed-фраза'); }
});

btnReveal.addEventListener('click', ()=> setMnemonicVisible(!reveal));

addressEl.addEventListener('click', async ()=>{
  if(!wallet) return;
  try{
    await navigator.clipboard.writeText(wallet.address);
    alert('Адрес скопирован в буфер обмена!');
  }catch(e){ console.error(e); }
});

btnSend.addEventListener('click', ()=> sendPanel.hidden = !sendPanel.hidden);

btnSendTx.addEventListener('click', async ()=>{
  if(!wallet) return alert('Кошелёк не подключен');
  const to = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  if(!to || !amount) return alert('Заполните все поля');
  txResult.textContent='Отправка...';
  try{
    const w = wallet.connect(getProvider());
    const tx = await w.sendTransaction({to,value:ethers.utils.parseEther(amount)});
    txResult.textContent=`Отправлено! TxHash: ${tx.hash}`;
    fetchTokens();
  }catch(e){ console.error(e); txResult.textContent='Ошибка отправки'; }
});

// Настройки
btnSettings.addEventListener('click', ()=>{
  walletPanel.hidden=true;
  settingsPanel.hidden=false;
});

btnCloseSettings.addEventListener('click', ()=>{
  settingsPanel.hidden=true;
  walletPanel.hidden=false;
});

btnShowPK.addEventListener('click', ()=>{
  if(!wallet) return alert('Кошелёк не подключен');
  alert(`PRIVATE KEY:\n\n${wallet.privateKey}`);
});

btnLogout.addEventListener('click', ()=>{
  if(!wallet) return;
  const confirmed = confirm('Вы записали или помните seed-фразу?');
  if(!confirmed) return;
  wallet=null;
  walletPanel.hidden=true;
  settingsPanel.hidden=true;
  btnNew.style.display='inline-block';
  btnImport.style.display='inline-block';
  addressEl.textContent='';
  mnemonicEl.textContent='';
  balanceEl.textContent='—';
});

// Подключение к dApp
window.myWalletProvider = {
  isConnected: !!wallet,
  request: async ({method, params})=>{
    if(method==='eth_requestAccounts'){
      if(!wallet) throw new Error('Кошелёк не подключен');
      return [wallet.address];
    }
    if(method==='eth_sendTransaction'){
      if(!wallet) throw new Error('Кошелёк не подключен');
      const txParams = params[0];
      const w = wallet.connect(getProvider());
      const tx = await w.sendTransaction({
        to: txParams.to,
        value: ethers.utils.parseEther(txParams.value)
      });
      return tx.hash;
    }
    throw new Error('Метод не поддерживается');
  }
};
})();
