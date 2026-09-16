# Fixture Design -- Search Results Page

Task context: User searches for products and filters results.

Design rationale: Usability testing found that users expected type-ahead suggestions (7 of 10 participants tried typing partial queries and waiting). The team decided on a 300ms debounce. A/B testing showed that showing result count in the search bar increased filter usage by 23%.

## Screen: Search Results

- Search bar at top: text input with magnifying glass icon, type-ahead suggestion dropdown, result count shown inline ("42 results")
- Filter sidebar: checkbox groups for Category, Price Range, Rating; "Clear all filters" link at top
- Results grid: product cards in a 3-column responsive grid (2 columns at md, 1 column at sm)
- Each product card: thumbnail image, product name (link), price, star rating, "Add to Cart" button
- Sort dropdown above results: "Relevance", "Price: Low to High", "Price: High to Low", "Newest"
- Pagination at bottom: numbered pages with prev/next arrows
- No results state: "No products match your filters" with "Clear filters" button
