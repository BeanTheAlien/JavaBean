"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interp = interp;
function interp(file, node) {
    if (node.type == "CallExpr") {
        return node.val;
    }
    if (node.type == "New") {
        return "new " + node.val;
    }
    if (node.type == "Array") {
        return `new ArrayList<>(Arrays.asList(${node.val.join(", ")}))`;
    }
    if (node.type == "ArrayAcs") {
        return `${node.val[0]}.get(${node.val[1]})`;
    }
    return node.val;
}
