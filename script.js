// 1. Select the search input and all the item cards
const searchInput = document.getElementById('searchInput');
const itemCards = document.querySelectorAll('.item-card');

// 2. Add an 'event listener' that runs every time the user types
searchInput.addEventListener('input', () => {
    const filterValue = searchInput.value.toLowerCase(); // Convert input to lowercase

    itemCards.forEach(card => {
        // Find the title (h3) inside each card
        const itemTitle = card.querySelector('h3').textContent.toLowerCase();

        // 3. Logic: If the title contains the search text, show it. Otherwise, hide it.
        if (itemTitle.includes(filterValue)) {
            card.style.display = "block"; // Show
            card.style.opacity = "1";     // Optional: for smooth feel
        } else {
            card.style.display = "none";  // Hide
        }
    });
});
