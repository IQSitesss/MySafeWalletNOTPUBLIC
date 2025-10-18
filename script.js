(() => {
const { ethers } = window;

// Элементы
const btnNew = document.getElementById('btnNew');
const btnImport = document.getElementById('btnImport');
const walletPanel = document.getElementById('walletPanel');
const addressEl = document.getElementById('address');
const mnemonicEl = document.getElementById('mnemonic');
const btnReveal = document.getElementById('btnReveal');
const passwordInput = document.getElementById('password');
const btnSaveLocal = document.getElementById('btnSaveLocal');
const btnShowPK = document.getElementById('btnShowPK');
const balanceEl = document.getElementById('balance');
const btnSend = document.getElementById('btnSend');
const sendPanel = document.getElementById('sendPanel');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const btnSendTx = document.getElementById('btnSendTx');
const txResult = document.getElementById('txResult');
const networkSelect = document.getElementById('networkSelect');

const importModal = document.getElementById('importModal');
const importSeed = document.getElementById('importSeed');
const btnImportConfirm = document.getElementById('btnImportConfirm');
const btnImportCancel = document.getElementById('btnImportCancel');

let wallet = null;
let reveal = true;

// -------------------------------------
// Инициализация: скрываем все панели
importModal.hidden = true;
importModal.style.display = 'none';
walletPanel.hidden = true;
sendPanel.hidden = true;

// -------------------------------------
// Проверка локально сохраненного кошелька
if(localStorage.getItem('MiniWallet')){
  alert('Обнаружен сохранённый кошелёк. Вы можете использовать его или удалить для создания нового.');
  btnNew.disabled = true;
}

// -------------------------------------
// Функции
function setMnemonicVisible(flag){
  reveal = flag;
  if(!wallet) return;
  mnemonicEl.textContent = reveal ? wallet.mnemonic?.phrase || '—' : '•••••••• •••••••• ••••••••';
  btnReveal.textContent = reveal ? 'Скрыть seed' : 'Показать seed';
}

function createWallet(){
  if(wallet) { alert('Кошелёк уже существует!'); return; }
  wallet = ethers.Wallet.createRandom();
  showWallet();
}

function showWallet(){
  walletPanel.hidden = false;
  addressEl.textContent = wallet.address;
  mnemonicEl.textContent = wallet.mnemonic?.phrase || '—';
  setMnemonicVisible(true);
  fetchBalance();
}

function getProvider(){
  const chain = networkSelect.value;
  if(chain === 'ETH'){ return ethers.getDefaultProvider(); }
  else if(chain === 'BSC'){ return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/'); }
}

async function fetchBalance(){
  if(!wallet) return;
  balanceEl.textContent = 'Загрузка...';
  try{
    const provider = getProvider();
    const bal = await provider.getBalance(wallet.address);
    balanceEl.textContent = `${ethers.utils.formatEther(bal)} ${networkSelect.value}`;
  }catch(e){
    console.error(e);
    balanceEl.textContent = 'Ошибка получения баланса';
  }
}

// -------------------------------------
// События
btnReveal.addEventListener('click',()=>setMnemonicVisible(!reveal));
btnNew.addEventListener('click',createWallet);

// Открытие модалки только по кнопке
btnImport.addEventListener('click',()=> {
  importModal.hidden = false;
  importModal.style.display = 'flex';
  importSeed.value = '';
});

// Кнопка "Отмена" закрывает модалку
btnImportCancel.addEventListener('click',()=> {
  importModal.hidden = true;
  importModal.style.display = 'none';
});

// Подтверждение импорта
btnImportConfirm.addEventListener('click',()=> {
  try{
    const phrase = importSeed.value.trim();
    if(!phrase) return alert('Введите seed-фразу!');
    wallet = ethers.Wallet.fromMnemonic(phrase);
    importModal.hidden = true;
    importModal.style.display = 'none';
    showWallet();
  }catch(e){ alert('Некорректная seed-фраза'); }
});

// Показ приватного ключа
btnShowPK.addEventListener('click',()=> {
  if(!wallet) return alert('Создайте или импортируйте кошелёк');
  alert(`PRIVATE KEY:\n\n${wallet.privateKey}`);
});

// Сохранение локально
btnSaveLocal.addEventListener('click',()=> {
  if(!wallet) return alert('Создайте кошелёк');
  const pw = passwordInput.value;
  if(!pw || pw.length<8) return alert('Пароль минимум 8 символов');
  wallet.encrypt(pw).then(json=>{
    localStorage.setItem('MiniWallet',json);
    alert('Сохранено локально');
    btnNew.disabled = true;
  }).catch(e=>alert('Ошибка шифрования'));
});

// Показ/скрытие панели отправки
btnSend.addEventListener('click',()=>sendPanel.hidden=!sendPanel.hidden);

// Отправка транзакции
btnSendTx.addEventListener('click',async()=> {
  if(!wallet) return alert('Создайте кошелёк');
  const to = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  if(!to || !amount) return alert('Заполните все поля');
  txResult.textContent = 'Отправка...';
  try{
    const provider = getProvider();
    const w = wallet.connect(provider);
    const tx = await w.sendTransaction({
      to,
      value: ethers.utils.parseEther(amount)
    });
    txResult.textContent = `Отправлено! TxHash: ${tx.hash}`;
    fetchBalance();
  }catch(e){
    console.error(e);
    txResult.textContent = 'Ошибка отправки транзакции';
  }
});

// Обновление баланса при смене сети
networkSelect.addEventListener('change', fetchBalance);
})();
