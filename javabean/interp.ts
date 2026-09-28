import { Node } from "./parse/parser";

export function interp<T extends Node>(file: string, node: T) {
    if(node.type == "CallExpr") {}
}