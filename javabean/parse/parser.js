"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parser = parser;
const errors_js_1 = require("../errors.js");
const interp_js_1 = require("../interp.js");
async function parser(file, tks) {
    let i = 0;
    while (i < tks.length) {
        const expr = parseExpr(tks, i);
        i = expr.next;
        (0, interp_js_1.interp)(file, expr.node);
    }
}
function parsePrim(tks, i) {
    const tk = tks[i];
    if (tk.id == "id")
        return { node: { type: "Id", val: tk.val }, next: i + 1 };
    if (tk.id == "string")
        return { node: { type: "Literal", val: tk.val }, next: i + 1 };
    if (tk.id == "num")
        return { node: { type: "Literal", val: Number(tk.val) }, next: i + 1 };
    throw new errors_js_1.UnexpectedTokenError(tk);
}
function parseExpr(tks, i) {
    let { node, next } = parsePrim(tks, i);
    while (tks[next] && (tks[next].id == "dot" || tks[next].id == "lparen")) {
        const tk = tks[next];
        if (tk.id == "dot") {
            const prop = tks[next + 1];
            node = {
                type: "MemberExpr",
                val: { obj: node, prop: prop.val }
            };
            next += 2;
        }
        else if (tk.id == "lparen") {
            const args = parseArgs(tks, next + 1);
            node = {
                type: "CallExpr",
                val: { callee: node, args: args }
            };
            next = args.next;
        }
    }
    return { node, next };
}
function parseArgs(tks, i) {
    const args = [];
    while (i < tks.length && tks[i].id != "rparen") {
        const expr = parseExpr(tks, i);
        args.push(expr.node);
        i = expr.next;
        if (tks[i]?.id == "comma")
            i++;
    }
    if (tks[i]?.id != "rparen")
        throw new Error();
    return { args, next: i + 1 };
}
function parseCommaList(tks, i) {
    const list = [];
    let count = 1;
    while (i < tks.length && count > 0) {
        const expr = parseExpr(tks, i);
        list.push(expr.node);
        i = expr.next;
        if (tks[i]?.id == "comma") {
            count++;
        }
        else {
            count--;
        }
    }
    return { list, next: i };
}
function retrieveBlock(tks, i) {
    let body = [];
    let depth = 0;
    i++;
    while (i < tks.length) {
        const tk = tks[i];
        if (tk.id == "lbrace")
            depth++;
        if (tk.id == "rbrace")
            depth--;
        if (depth == 0)
            break;
        body.push(tk);
        i++;
    }
    i++;
    if (depth > 0)
        throw new errors_js_1.UnterminatedStatementError(tks[i - 1], "block", "}");
    return body;
}
function parseBlock(body) {
    let parsed = [];
    let i = 0;
    while (i < body.length) {
        const p = parseExpr(body, i);
        parsed.push(p.node);
        i = p.next;
    }
    return { node: { type: "BlockStm", val: parsed }, next: i };
}
