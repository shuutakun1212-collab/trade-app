const codeEl = document.getElementById("code");
const stockEl = document.getElementById("stock");
const quantityEl = document.getElementById("quantity");
const priceEl = document.getElementById("price");
const targetPriceEl = document.getElementById("targetPrice");
const addBtn = document.getElementById("add");
const updateBtn = document.getElementById("update");
const listEl = document.getElementById("list");
const totalEl = document.getElementById("total");

let trades = JSON.parse(localStorage.getItem("trades")) || [];
let editIndex = null;

function openMinkabu(code) {
  window.open(`https://minkabu.jp/stock/${code}`, "_blank");
}

function goToSell(index) {
  const t = trades[index];
  const params = new URLSearchParams({
    code: t.code,
    stock: t.stock,
    price: t.price,
    quantity: t.quantity
  });
  location.href = `sell.html?${params.toString()}`;
}

function render() {
  listEl.innerHTML = "";
  let total = 0;

  trades.forEach((t, i) => {
    const cost = t.price * t.quantity;
    total += cost;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.code}/${t.stock}</td>
      <td>${t.quantity}</td>
      <td>${t.price}</td>
      <td>${cost.toLocaleString()} 円</td>
      <td>${t.targetPrice || "-"}</td>
      <td>
        <button class="icon-btn" onclick="openMinkabu('${t.code}')">
          <i class="fa-solid fa-chart-line"></i>
        </button>
      </td>
      <td>
        <button class="icon-btn" onclick="goToSell(${i})">
          <i class="fa-solid fa-yen-sign"></i>
        </button>
        <button class="icon-btn edit" data-i="${i}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn delete" data-i="${i}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    listEl.appendChild(tr);
  });

  totalEl.textContent = `投資総額：${total.toLocaleString()} 円`;
}

render();

addBtn.onclick = () => {
  const code = codeEl.value.trim();
  const stock = stockEl.value.trim();
  const quantity = Number(quantityEl.value);
  const price = Number(priceEl.value);
  const targetPrice = Number(targetPriceEl.value) || null;

  if (!code || !stock || quantity <= 0 || price <= 0) {
    alert("入力を確認してください");
    return;
  }

  // 同じ銘柄番号があるか探す
  const existingIndex = trades.findIndex(t => t.code === code);

  if (existingIndex !== -1) {
    // ===== すでに存在する場合：合算 =====
    const existing = trades[existingIndex];

    const oldQty = existing.quantity;
    const oldPrice = existing.price;

    const totalQty = oldQty + quantity;
    const avgPrice =
      ((oldQty * oldPrice) + (quantity * price)) / totalQty;

    trades[existingIndex] = {
      ...existing,
      quantity: totalQty,
      price: Math.round(avgPrice), // 平均取得単価
      targetPrice: targetPrice ?? existing.targetPrice
    };

  } else {
    // ===== 新規銘柄 =====
    trades.unshift({
      date: new Date().toISOString().slice(0, 10),
      code,
      stock,
      quantity,
      price,
      targetPrice
    });
  }

  localStorage.setItem("trades", JSON.stringify(trades));
  render();

  // 入力欄クリア
  codeEl.value = "";
  stockEl.value = "";
  quantityEl.value = "";
  priceEl.value = "";
  targetPriceEl.value = "";
};


listEl.onclick = (e) => {
  const i = e.target.closest("button")?.dataset.i;
  if (e.target.closest(".delete")) {
    trades.splice(i, 1);
  }
  if (e.target.closest(".edit")) {
    const t = trades[i];
    codeEl.value = t.code;
    stockEl.value = t.stock;
    quantityEl.value = t.quantity;
    priceEl.value = t.price;
    targetPriceEl.value = t.targetPrice ?? "";
    editIndex = i;
    addBtn.style.display = "none";
    updateBtn.style.display = "inline";
  }
  localStorage.setItem("trades", JSON.stringify(trades));
  render();
};

updateBtn.onclick = () => {
  trades[editIndex] = {
    ...trades[editIndex],
    code: codeEl.value,
    stock: stockEl.value,
    quantity: +quantityEl.value,
    price: +priceEl.value,
    targetPrice: +targetPriceEl.value || null
  };
  localStorage.setItem("trades", JSON.stringify(trades));
  render();
  editIndex = null;
  addBtn.style.display = "inline";
  updateBtn.style.display = "none";
};
