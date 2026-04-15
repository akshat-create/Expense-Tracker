const STORAGE_KEY = "expense-tracker-transactions";

const expenseForm = document.getElementById("expenseForm");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");

const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const searchInput = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");

const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const totalBalance = document.getElementById("totalBalance");
const transactionCount = document.getElementById("transactionCount");
const transactionsList = document.getElementById("transactionsList");
const categoryBreakdown = document.getElementById("categoryBreakdown");

const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");

let transactions = loadTransactions();

setTodayAsDefault();
renderApp();

expenseForm.addEventListener("submit", handleFormSubmit);
resetBtn.addEventListener("click", resetFilters);
clearAllBtn.addEventListener("click", clearAllTransactions);
exportBtn.addEventListener("click", exportTransactionsAsCsv);

categoryFilter.addEventListener("change", renderApp);
typeFilter.addEventListener("change", renderApp);
searchInput.addEventListener("input", renderApp);

transactionsList.addEventListener("click", (event) => {
    if (!event.target.classList.contains("transaction-delete")) {
        return;
    }

    const transactionId = event.target.dataset.id;
    deleteTransaction(transactionId);
});

function handleFormSubmit(event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;
    const type = typeInput.value;

    if (!description || !amount || amount <= 0 || !category || !date || !type) {
        alert("Please fill in all fields with a valid amount.");
        return;
    }

    const newTransaction = {
        id: String(Date.now()),
        description,
        amount,
        category,
        date,
        type
    };

    transactions.unshift(newTransaction);
    saveTransactions();
    expenseForm.reset();
    setTodayAsDefault();
    renderApp();
}

function renderApp() {
    const filteredTransactions = getFilteredTransactions();

    renderSummary();
    renderTransactions(filteredTransactions);
    renderCategoryBreakdown();
    transactionCount.textContent = `${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? "" : "s"}`;
}

function renderSummary() {
    const incomeTotal = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expenseTotal = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    totalIncome.textContent = formatCurrency(incomeTotal);
    totalExpense.textContent = formatCurrency(expenseTotal);
    totalBalance.textContent = formatCurrency(incomeTotal - expenseTotal);
}

function renderTransactions(items) {
    if (items.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <p>No matching transactions found.</p>
            </div>
        `;
        return;
    }

    transactionsList.innerHTML = items
        .map((transaction) => {
            const sign = transaction.type === "income" ? "+" : "-";
            const icon = transaction.type === "income" ? "+" : "-";

            return `
                <div class="transaction-item">
                    <div class="transaction-content">
                        <div class="transaction-icon">${icon}</div>
                        <div class="transaction-details">
                            <p class="transaction-description">${escapeHtml(transaction.description)}</p>
                            <div class="transaction-meta">
                                <span>${formatDate(transaction.date)}</span>
                                <span class="transaction-category">${escapeHtml(transaction.category)}</span>
                                <span>${capitalize(transaction.type)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="transaction-actions">
                        <p class="transaction-amount ${transaction.type}">
                            ${sign}${formatCurrency(transaction.amount)}
                        </p>
                        <button
                            type="button"
                            class="transaction-delete"
                            data-id="${transaction.id}"
                            aria-label="Delete transaction"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            `;
        })
        .join("");
}

function renderCategoryBreakdown() {
    const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");

    if (expenseTransactions.length === 0) {
        categoryBreakdown.innerHTML = `
            <div class="empty-state">
                <p>No expense data to display.</p>
            </div>
        `;
        return;
    }

    const totalsByCategory = {};

    expenseTransactions.forEach((transaction) => {
        if (!totalsByCategory[transaction.category]) {
            totalsByCategory[transaction.category] = 0;
        }

        totalsByCategory[transaction.category] += transaction.amount;
    });

    const highestAmount = Math.max(...Object.values(totalsByCategory));

    categoryBreakdown.innerHTML = Object.entries(totalsByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([category, total]) => {
            const width = highestAmount === 0 ? 0 : (total / highestAmount) * 100;

            return `
                <div class="category-item">
                    <p class="category-name">${escapeHtml(category)}</p>
                    <div class="category-details">
                        <div class="category-bar">
                            <div class="category-progress" style="width: ${width}%"></div>
                        </div>
                        <p class="category-amount">${formatCurrency(total)}</p>
                    </div>
                </div>
            `;
        })
        .join("");
}

function getFilteredTransactions() {
    const selectedCategory = categoryFilter.value;
    const selectedType = typeFilter.value;
    const searchTerm = searchInput.value.trim().toLowerCase();

    return [...transactions]
        .filter((transaction) => {
            const matchesCategory = selectedCategory === "" || transaction.category === selectedCategory;
            const matchesType = selectedType === "" || transaction.type === selectedType;
            const matchesSearch = transaction.description.toLowerCase().includes(searchTerm);

            return matchesCategory && matchesType && matchesSearch;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function deleteTransaction(transactionId) {
    transactions = transactions.filter((transaction) => transaction.id !== transactionId);
    saveTransactions();
    renderApp();
}

function clearAllTransactions() {
    if (transactions.length === 0) {
        alert("There is no data to clear.");
        return;
    }

    const shouldClear = window.confirm("Do you want to remove all transactions?");

    if (!shouldClear) {
        return;
    }

    transactions = [];
    saveTransactions();
    renderApp();
}

function resetFilters() {
    categoryFilter.value = "";
    typeFilter.value = "";
    searchInput.value = "";
    renderApp();
}

function exportTransactionsAsCsv() {
    if (transactions.length === 0) {
        alert("Add some transactions before exporting.");
        return;
    }

    const rows = [
        ["Description", "Amount", "Category", "Date", "Type"],
        ...transactions.map((transaction) => [
            transaction.description,
            transaction.amount.toFixed(2),
            transaction.category,
            transaction.date,
            transaction.type
        ])
    ];

    const csvContent = rows
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = "expense-tracker-data.csv";
    downloadLink.click();

    URL.revokeObjectURL(url);
}

function loadTransactions() {
    const savedTransactions = localStorage.getItem(STORAGE_KEY);

    if (!savedTransactions) {
        return [];
    }

    try {
        return JSON.parse(savedTransactions);
    } catch (error) {
        console.error("Could not read saved transactions.", error);
        return [];
    }
}

function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function setTodayAsDefault() {
    dateInput.value = new Date().toISOString().split("T")[0];
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeCsvValue(value) {
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
