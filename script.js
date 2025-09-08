   // Sample Products
    const products = [
      { id: 1, name: "Laptop", price: 800, image: "images/laptop.jpg" },
      { id: 2, name: "Smartphone", price: 400, image: "images/phone.jpg" },
      { id: 3, name: "Headphones", price: 50, image: "images/headphones.jpg" },
      { id: 4, name: "Smart Watch", price: 120, image: "images/watch.jpg" }
    ];

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const productList = document.getElementById('product-list');
    const cartItems = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('total');
    const checkoutModal = document.getElementById('checkout-modal');
    const confirmation = document.getElementById('confirmation');

    /* Display Products Dynamically */
    function displayProducts() {
  const productList = document.getElementById('product-list');
  productList.innerHTML = "";
  products.forEach(product => {
    const div = document.createElement('div');
    div.classList.add('product');
    div.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>$${product.price}</p>
      <button onclick="addToCart(${product.id})">Add to Cart</button>
    `;
    productList.appendChild(div);
  });
}
    /* Add Product to Cart */
    function addToCart(id) {
      const product = products.find(p => p.id === id);
      const existingItem = cart.find(item => item.id === id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }

      saveCart();
      renderCart();
    }

    /* Remove Product from Cart */
    function removeFromCart(id) {
      cart = cart.filter(item => item.id !== id);
      saveCart();
      renderCart();
    }

    /* Save Cart to LocalStorage */
    function saveCart() {
      localStorage.setItem('cart', JSON.stringify(cart));
    }

    /* Render Cart */
    function renderCart() {
      cartItems.innerHTML = "";
      let total = 0;

      cart.forEach(item => {
        total += item.price * item.quantity;
        const li = document.createElement('li');
        li.innerHTML = `
          ${item.name} (x${item.quantity}) - $${item.price * item.quantity}
          <button onclick="removeFromCart(${item.id})">Remove</button>
        `;
        cartItems.appendChild(li);
      });

      totalDisplay.textContent = total.toFixed(2);
    }

    /* Clear Cart */
    function clearCart() {
      cart = [];
      saveCart();
      renderCart();
    }

    /* Open Checkout Form */
    function openCheckout() {
      if (cart.length === 0) {
        alert("Your cart is empty. Please add items first.");
        return;
      }
      checkoutModal.classList.add('active');
    }

    /* Close Checkout Form */
    function closeCheckout() {
      checkoutModal.classList.remove('active');
    }

    /* Submit Order */
    function submitOrder() {
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const address = document.getElementById('customer-address').value.trim();

      if (!name || !email || !address) {
        alert("Please fill in all fields!");
        return;
      }

      // Simulate order submission
      confirmation.style.display = "block";
      setTimeout(() => {
        confirmation.style.display = "none";
      }, 4000);

      // Clear cart after order
      clearCart();
      closeCheckout();
    }

    /* Initialize Page */
    displayProducts();
    renderCart()