import {test} from 'node:test';
import assert from 'node:assert/strict';
import filters from '../../public/listing-filters.js';
const {filterListings}=filters;
const listings=[
  {public_id:'a',title:'Books',description:'Paperbacks',sale_type_details:{id:1},item_category_details:[{id:1},{id:2}]},
  {public_id:'b',title:'Sofa',description:'BOOKS and furniture',sale_type_details:{id:2},item_category_details:[{id:2}]},
  {public_id:'c',title:null,description:null}
];
const ids=rows=>rows.map(row=>row.public_id);
test('all listings preserve API order and input data',()=>{
  const before=structuredClone(listings);
  assert.deepEqual(ids(filterListings(listings)),['a','b','c']);
  assert.deepEqual(listings,before);
  assert.deepEqual(filterListings([]),[]);
});
test('sale type, category and case-insensitive trimmed search intersect',()=>{
  assert.deepEqual(ids(filterListings(listings,{selectedSaleType:'2',selectedCategory:'2',search:'  BoOkS  '})),['b']);
  assert.deepEqual(ids(filterListings(listings,{selectedSaleType:'1',selectedCategory:'2'})),['a']);
  assert.deepEqual(filterListings(listings,{selectedSaleType:'2',selectedCategory:'1'}),[]);
});
test('favorites use public IDs and still apply category and search',()=>{
  assert.deepEqual(ids(filterListings(listings,{selectedSaleType:'favorites',favoriteIds:['b','missing','a'],selectedCategory:'1',search:'books'})),['a']);
  assert.deepEqual(filterListings(listings,{selectedSaleType:'favorites'}),[]);
});
test('missing lookup/text fields are safe and unmatched filters return no results',()=>{
  assert.deepEqual(ids(filterListings(listings,{search:'paper'})),['a']);
  for(const options of [{search:'absent'},{selectedSaleType:'99'},{selectedCategory:'99'}])
    assert.deepEqual(filterListings(listings,options),[]);
  assert.deepEqual(ids(filterListings(listings,{search:'   '})),['a','b','c']);
});
