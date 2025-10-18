// script.js — клиентская логика кошелька (ethers.js)
(() => {
  const { ethers } = window; // ethers из CDN

  // Элементы
  const btnCreate = document.getElementById('btnCreate');
  const btnReveal = document.getElementById('btnReveal');
  const walletPanel = document.getElementById('walletPanel');
  const addressEl = document.getElementById('address');
  const mnemonicEl = document.getElementById('mnemonic');
  const btnVerify = document.getElementById('btnVerify');
  const verifyIdx1 = document.getElementById('verifyIdx1');
  const verifyIdx2 = document.getElementById('verifyIdx2');
  const verifyWord1 = document.getElementById('verifyWord1');
  const verifyWord2 = document.getElementById('verifyWord2');
  const verifyResult = document.getElementById('verifyResult');
  const passwordInput = document.getElementById('password');
  const passwordInput2 = document.getElementById('password2');
  const btnEncrypt = document.getElementById('btnEncrypt');
  const encryptStatus = document.getElementById('encryptStatus');
  const btnShowPK = document.getElementById('btnShowPK');
  const btnDownloadRaw = document.getElementById('btnDownloadRaw');
  const balanceEl = document.getElementById('balance');
  const btnShowBalance = document.getElementById('btnShowBalance');

  let currentWallet = null;
  let reveal = true; // показываем seed по умолчанию (можешь поменять на false)

  function randomTwoIndices(total) {
    // возвращаем две разные случайные позиции 1..total
    const a = Math.floor(Math.random() * total) + 1;
    let b = Math.floor(Math.random() * total) + 1;
    while (b === a) b = Math.floor(Math.random() * total) + 1;
    return [a, b];
  }

  function setMnemonicVisible(flag) {
    reveal = flag;
    if (!currentWallet) return;
    mnemonicEl.textContent = reveal ? currentWallet.mnemonic.phrase : '•••••••• •••••••• ••••••••';
    btnReveal.textContent = reveal ? 'Скрыть seed' : 'Показать seed';
  }

  async function createWallet() {
    // Генерируем новый wallet (ethers.js создаёт 12-словный mnemonic)
    currentWallet = ethers.Wallet.createRandom();
    addressEl.textContent = currentWallet.address;
    mnemonicEl.textContent = currentWallet.mnemonic.phrase;
    walletPanel.hidden = false;
    verifyResult.textContent = '';
    encryptStatus.textContent = '';
    btnShowBalance.disabled = false;

    // выбираем случайные позиции для проверки
    const words = currentWallet.mnemonic.phrase.split(/\s+/);
    const total = words.length; // обычно 12
    const [i1, i2] = randomTwoIndices(total);
    verifyIdx1.value = `#${i1}`;
    verifyIdx2.value = `#${i2}`;
    verifyWord1.value = '';
    verifyWord2.value = '';
    setMnemonicVisible(true);
  }

  function verifySeed() {
    if (!currentWallet) return alert('Создайте кошелёк сначала.');
    const words = currentWallet.mnemonic.phrase.split(/\s+/);
    const idx1 = parseInt(verifyIdx1.value.replace('#', ''), 10) - 1;
    const idx2 = parseInt(verifyIdx2.value.replace('#', ''), 10) - 1;
    const w1 = (verifyWord1.value || '').trim().toLowerCase();
    const w2 = (verifyWord2.value || '').trim().toLowerCase();

    if (!w1 || !w2) {
      verifyResult.textContent = 'Введите оба слова для проверки.';
      return;
    }

    const ok1 = words[idx1] === w1;
    const ok2 = words[idx2] === w2;

    if (ok1 && ok2) {
      verifyResult.style.color = 'green';
      verifyResult.textContent = 'Проверка пройдена — seed записан правильно.';
    } else {
      verifyResult.style.color = 'crimson';
      verifyResult.textContent = 'Неправильно — проверьте записи.';
    }
  }

  async function encryptAndDownload() {
    if (!currentWallet) return alert('Создайте кошелёк сначала.');
    const p1 = passwordInput.value;
    const p2 = passwordInput2.value;
    if (!p1 || p1.length < 8) return alert('Пароль должен быть минимум 8 символов.');
    if (p1 !== p2) return alert('Пароли не совпадают.');

    encryptStatus.textContent = 'Шифрование... это может занять несколько секунд (используется PBKDF2).';
    try {
      const json = await currentWallet.encrypt(p1, { scrypt: { N: 1 << 18 } }); // можно убрать heavy опцию если медленно
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `keystore-${currentWallet.address.substring(2, 10)}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      encryptStatus.style.color = 'green';
      encryptStatus.textContent = 'Готово — файл keystore скачан. Храните его в надёжном месте.';
    } catch (e) {
      console.error(e);
      encryptStatus.style.color = 'crimson';
      encryptStatus.textContent = 'Ошибка шифрования. Попробуйте другой пароль.';
    }
  }

  function downloadRawPK() {
    if (!currentWallet) return alert('Создайте кошелёк сначала.');
    const pk = currentWallet.privateKey;
    const blob = new Blob([pk], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `privkey-${currentWallet.address.substring(2, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function showPrivateKey() {
    if (!currentWallet) return alert('Создайте кошелёк сначала.');
    // подтверждение
    const ok = confirm('Показать приватный ключ на экране? Никому не показывайте. Продолжить?');
    if (!ok) return;
    alert(`PRIVATE KEY:\n\n${currentWallet.privateKey}\n\nНЕ ДЕЛАЙТЕ СНИМКИ ЭКРАНА И НЕ ПЕРЕДАВАЙТЕ ЕГО.`);
  }

  async function fetchBalance() {
    if (!currentWallet) return alert('Создайте кошелёк сначала.');
    balanceEl.textContent = 'Загрузка...';
    try {
      // использует стандартный публичный провайдер ethers; для надежности можно указать свой Infura/Alchemy key
      const provider = ethers.getDefaultProvider();
      const bal = await provider.getBalance(currentWallet.address);
      balanceEl.textContent = `${ethers.utils.formatEther(bal)} ETH`;
    } catch (e) {
      console.error(e);
      balanceEl.textContent = 'Не удалось получить баланс (провайдер недоступен).';
    }
  }

  // Привязываем обработчики
  btnCreate.addEventListener('click', createWallet);
  btnReveal.addEventListener('click', () => setMnemonicVisible(!reveal));
  btnVerify.addEventListener('click', verifySeed);
  btnEncrypt.addEventListener('click', encryptAndDownload);
  btnShowPK.addEventListener('click', showPrivateKey);
  btnDownloadRaw.addEventListener('click', downloadRawPK);
  btnShowBalance.addEventListener('click', fetchBalance);

  // Инициализация: можно подгрузить подсказку
  mnemonicEl.textContent = 'Нажмите «Создать новый кошелёк»';
})();
