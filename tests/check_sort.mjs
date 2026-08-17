import assert from "node:assert/strict";
import {sortMatches} from "../assets/sort.js";

const popularity = item => ({total:{
  invalidDate:40, newest:90, older:80, oldUndated:70,
}[item.id] || 0});
const wrap = item => ({item, score:item.score || 0});
const items = [
  {id:"oldUndated", name:"Old Undated", _src:"z", _rank:3},
  {id:"newest", name:"Newest", updated:"2026-08-17", _src:"a", _rank:0},
  {id:"older", name:"Older", released:"2026-08-16", _src:"b", _rank:1},
  {id:"invalidDate", name:"Invalid Date", updated:"not-a-date", _src:"c", _rank:2},
];
const options = {popularity, sourceOrder:["a", "b", "c", "z"], categoryLabels:{}};

const latest = sortMatches(items.map(wrap), {...options, mode:"latest"});
assert.deepEqual(latest.map(entry => entry.item.id), ["newest", "older", "oldUndated", "invalidDate"]);

const byName = sortMatches(items.map(wrap), {...options, mode:"name", locale:"en"});
assert.deepEqual(byName.map(entry => entry.item.name), ["Invalid Date", "Newest", "Old Undated", "Older"]);

const bySource = sortMatches(items.map(wrap), {...options, mode:"source"});
assert.deepEqual(bySource.map(entry => entry.item.id), ["newest", "older", "invalidDate", "oldUndated"]);

const categoryItems = [
  {id:"newest", name:"Newest", cat:"glow"},
  {id:"older", name:"Older", cat:"color"},
];
const byCategory = sortMatches(categoryItems.map(wrap), {
  ...options,
  mode:"category",
  categoryLabels:{glow:"Glow", color:"Color"},
  popularity:() => ({total:0}),
});
assert.deepEqual(byCategory.map(entry => entry.item.id), ["older", "newest"]);

const relevant = sortMatches(
  [{item:{id:"a", name:"A"}, score:50}, {item:{id:"b", name:"B"}, score:80}],
  {...options, mode:"relevance", hasTerms:true},
);
assert.deepEqual(relevant.map(entry => entry.item.id), ["b", "a"]);

const popular = sortMatches(items.map(wrap), {...options, mode:"popular"});
assert.deepEqual(popular.map(entry => entry.item.id), ["newest", "older", "oldUndated", "invalidDate"]);

console.log("sort checks passed");
