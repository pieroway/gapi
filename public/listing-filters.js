// Shared by the browser and Node unit tests; presentation filtering only.
(function (root) {
  function filterListings(events, {selectedSaleType = 'all', selectedCategory = 'all', search = '', favoriteIds = []} = {}) {
    const searchTerm = search.toLowerCase().trim();
    let filtered = events;

    // 1. Apply primary filter (Sale Type or Favorites)
    if (selectedSaleType === "favorites") {
      filtered = filtered.filter((event) =>
        favoriteIds.includes(event.public_id)
      );
    } else if (selectedSaleType !== "all") {
      filtered = filtered.filter(
        (event) => event.sale_type_details?.id === parseInt(selectedSaleType)
      );
    }

    // 2. Apply secondary filters (Category and Search) on the result
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (event) =>
          event.item_category_details &&
          event.item_category_details.some(cat => cat.id === parseInt(selectedCategory))
      );
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          (event.title && event.title.toLowerCase().includes(searchTerm)) ||
          (event.description &&
            event.description.toLowerCase().includes(searchTerm))
      );
    }
    return filtered;
  }
  const api = {filterListings};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GapiFilters = api;
})(globalThis);
