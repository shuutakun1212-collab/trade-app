// ===== URLパラメータ =====
const params = new URLSearchParams(location.search);
const code = params.get("code");
const stock = params.get("stock");
const buyPrice = Number(params.get("price"));
const holdQuantity = Number(params.get("quantity"));

// ===== 要素 =====
const codeEl = document.getElementById("code");
const stockEl = document.getElementById("stock");
const buyPriceEl = document.getElementById("buyPrice");
const holdQtyEl = document.getElementById("holdQuantity");
const sellQtyEl = document.getElementById("sellQuantity");
const sellPriceEl = document.getElementById("sellPrice");
const sellBtn = document.getElementById("sell");
const resultEl = document.getElementById("result");
const sellListEl = document.getElementById("sellList");
const memoEl = document.getElementById("memo");

// ===== util =====

function getSells() {
  return JSON.parse(localStorage.getItem("sells")) || [];
}
function setSells(arr) {
  localStorage.setItem("sells", JSON.stringify(arr));
}
function calcProfit(buy, sell, qty) {
  return (sell - buy) * qty;
}

// ISO週番号を取得
function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo =
    1 +
    Math.round(
      ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function groupByWeek(sells) {
  return sells.reduce((acc, s) => {
    const key = getWeekKey(s.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
}

// 週ごとにグループ化

function renderSellList() {
  const sells = getSells();
  sellListEl.innerHTML = "";

  // ★元の配列indexを付与
  const sellsWithIndex = sells.map((s, originalIndex) => ({
    ...s,
    __idx: originalIndex
  }));

  // ★週ごとに分けるのは「sellsWithIndex」
  const grouped = groupByWeek(sellsWithIndex);

  Object.keys(grouped)
    .sort()
    .reverse()
    .forEach(weekKey => {
      const weekSells = grouped[weekKey];

      // 週ヘッダー
      const headerTr = document.createElement("tr");
      headerTr.className = "week-header";
      headerTr.innerHTML = `
        <td colspan="9"> ${weekKey}</td>
      `;
      sellListEl.appendChild(headerTr);

      let weekProfit = 0;

      weekSells.forEach((s, index) => {
        const rate =
          s.profitRate ??
          ((s.profit / (s.buyPrice * s.quantity)) * 100);

        weekProfit += s.profit;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${s.date}</td>
          <td>${s.code}/${s.stock}</td>
          <td>${s.buyPrice}</td>
          <td>${s.sellPrice}</td>
          <td>${s.quantity}</td>
          <td class="${s.profit >= 0 ? "profit-plus" : "profit-minus"}">
            ${Number(s.profit).toLocaleString()} 円
          </td>
          <td class="${rate >= 0 ? "profit-plus" : "profit-minus"}">
            ${rate.toFixed(2)} %
          </td>
          <td>
            ${s.memo ? s.memo : "-"}
          </td>
          <td>
            <button class="edit-sell" data-index="${s.__idx}">編集</button>
            <button class="delete-sell" data-index="${s.__idx}">削除</button>
          </td>
        `;
        sellListEl.appendChild(tr);
      });

      // 週サマリー
      const sumTr = document.createElement("tr");
      sumTr.className = "week-summary";
      sumTr.innerHTML = `
        <td colspan="9">
          週合計損益：${weekProfit.toLocaleString()} 円
        </td>
      `;
      sellListEl.appendChild(sumTr);
    });
}

renderSellList();

// ===== 売却処理（部分売却） =====
sellBtn.addEventListener("click", () => {
  const sellPrice = Number(sellPriceEl.value);
  const sellQuantity = Number(sellQtyEl.value);
  const memo = memoEl.value.trim();

  if (!(sellPrice > 0)) {
    alert("売却価格を入力してください");
    return;
  }
  if (!(sellQuantity > 0)) {
    alert("売却株数を入力してください");
    return;
  }
  if (!code || !stock || !(buyPrice > 0) || !(holdQuantity > 0)) {
    alert("売却対象の情報が不足しています（index.htmlから売却ボタンで遷移してください）");
    return;
  }
  if (sellQuantity > holdQuantity) {
    alert("売却株数が保有株数を超えています");
    return;
  }

  const ok = confirm(
    `以下の内容で売却しますか？\n\n` +
    `銘柄：${code}/${stock}\n` +
    `売却株数：${sellQuantity}\n` +
    `売却価格：${sellPrice}`
  );
  if (!ok) return;

  const profit = calcProfit(buyPrice, sellPrice, sellQuantity);
  const profitRate =
  (profit / (buyPrice * sellQuantity)) * 100;

  // 売却履歴保存
  let sells = getSells();
  sellListEl.innerHTML = "";

  // ★並びを固定（新しい日付が上）
  sells = sells.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  sells.unshift({
    date: new Date().toISOString().slice(0, 10),
    code,
    stock,
    buyPrice,
    sellPrice,
    quantity: sellQuantity,
    profit,
    profitRate,
    memo
  });
  setSells(sells);

  // 保有株数を減らす（code一致）
  let trades = JSON.parse(localStorage.getItem("trades")) || [];
  trades = trades
    .map(t => (t.code === code ? { ...t, quantity: t.quantity - sellQuantity } : t))
    .filter(t => t.quantity > 0);
  localStorage.setItem("trades", JSON.stringify(trades));

  resultEl.textContent = `売却完了：損益 ${profit.toLocaleString()} 円`;
  resultEl.className = profit >= 0 ? "profit-plus" : "profit-minus";

  sellQtyEl.value = "";
  sellPriceEl.value = "";
  renderSellList();
});

// ===== 編集・削除 =====
sellListEl.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-sell");
  const deleteBtn = e.target.closest(".delete-sell");
  if (!editBtn && !deleteBtn) return;

  const index = Number((editBtn || deleteBtn).dataset.index);
  const sells = getSells();

  // 削除
  if (deleteBtn) {
    if (!confirm("この売却記録を削除しますか？")) return;
   sells.splice(index, 1);

  // ★追加：保存順もdate降順にそろえる
   sells.sort((a, b) => new Date(b.date) - new Date(a.date));

   setSells(sells);
   renderSellList();
   return;
  }

  // 編集（promptで1件ずつ）
  const s = sells[index];

  const newDate = prompt("日付（YYYY-MM-DD）", s.date);
  if (newDate === null) return;

  const newBuy = Number(prompt("取得単価", s.buyPrice));
  if (!(newBuy > 0)) return alert("取得単価が不正です");

  const newSell = Number(prompt("売却単価", s.sellPrice));
  if (!(newSell > 0)) return alert("売却単価が不正です");

  const newQty = Number(prompt("株数", s.quantity));
  if (!(newQty > 0)) return alert("株数が不正です");

  const newProfit = calcProfit(newBuy, newSell, newQty);
  const profitRate = (newProfit / (s.buyPrice * newQty)) * 100;

  const newMemo = prompt("メモ", s.memo || "");

  sells[index] = {
    ...s,
    date: String(newDate).slice(0, 10),
    buyPrice: newBuy,
    sellPrice: newSell,
    quantity: newQty,
    profit: newProfit,
    profitRate: profitRate,
    memo: newMemo
  };

  // ★追加：保存順もdate降順にそろえる
  sells.sort((a, b) => new Date(b.date) - new Date(a.date));

  setSells(sells);
  renderSellList();
});
