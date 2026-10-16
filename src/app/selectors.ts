import { complete } from "../domain/playoff/outcomes";
import { store } from "./store";
export function displayState() {
  return store.seasonView?.snapshot || store.state;
}
export function isReadOnly() {
  return !!store.seasonView || complete(store.state);
}
