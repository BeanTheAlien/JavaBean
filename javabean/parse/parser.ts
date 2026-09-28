import type { Token, TokenList } from "../tokenizer.js";
import { MissingTokenError, UnexpectedTerminationError, UnexpectedTokenError, UnterminatedStatementError } from "../errors.js";
import * as fs from "fs";
import { interp } from "../interp.js";

type ParsedID = "MemberExpr" | "CallExpr" | "Literal" | "Assignment" | "Dec" | "Id" | "ArrayExpr" | "BlockStm" | "FuncDec" | "MethodDec" | "PropDec" | "ArrayAcs" | "CondHeader" | "PropGet" | "PropSet" | "IdOpr" | "New";
type Node = { type: ParsedID, val: any };
type Next = { next: number };
type Parsed = { node: Node } & Next;
type ParsedList = Parsed[];
type PrmParsed = Promise<Parsed>;
type NodeList = Node[];
interface NodeMap {
    MemberExpr: ParsedMemberExpr;
    CallExpr: ParsedCallExpr;
    Literal: LiteralNode;
    Id: IdNode;
    Assignment: AssignmentNode;
    Dec: DecNode;
}
type AssignmentNode = MkNode<"Assignment", [string, Node]>;
type DecNode = MkNode<"Dec", string>;
export { Node, NodeMap };
async function parser(file: string, tks: TokenList): Promise<void> {
    let i = 0;
    while(i < tks.length) {
        const expr = parseExpr(tks, i);
        i = expr.next;
        interp(file, expr.node);
    }
}
type MkNode<T extends ParsedID, V = any> = { node: { type: T, val: V } } & Next;
type LiteralNode = MkNode<"Literal", string | number>;
type IdNode = MkNode<"Id", string>;
function parsePrim(tks: TokenList, i: number): Parsed {
    const tk = tks[i];
    // check for paren at some point
    // likely call
    if(tk.id == "id" && tks[i+1]) {
        const s = tks.slice(i+1);
        if(s.some(t => t.id == "lparen")) {
            const sx = s.slice(0, s.findIndex(t => t.id == "lparen"));
            return { node: { type: "CallExpr", val: sx }, next: i+sx.length };
        }
    }
    // construction (no global appension)
    if(tk.id == "id" && tk.val == "new") {
        const pp = parsePrim(tks, i+1);
        return { node: { type: "New", val: pp.node.val }, next: pp.next };
    }
    // no validation at this point
    return { node: { type: "Id", val: tk.val }, next: i+1 };
}
type ParsedMemberExpr = MkNode<"MemberExpr", { obj: Node, prop: string }>;
type ParsedCallExpr = MkNode<"CallExpr", { callee: Node, args: ParsedArgs }>;
function parseExpr(tks: TokenList, i: number): Parsed {
    let { node, next } = parsePrim(tks, i);
    while(tks[next] && (tks[next].id == "dot" || tks[next].id == "lparen")) {
        const tk = tks[next];
        if(tk.id == "dot") {
            const prop = tks[next+1];
            node = {
                type: "MemberExpr",
                val: { obj: node, prop: prop.val }
            };
            next += 2;
        } else if(tk.id == "lparen") {
            const args = parseArgs(tks, next+1);
            node = {
                type: "CallExpr",
                val: { callee: node, args: args }
            };
            next = args.next;
        }
    }
    return { node, next };
}
type ParsedArgs = { args: NodeList } & Next;
function parseArgs(tks: TokenList, i: number): ParsedArgs {
    const args = [];
    while(i < tks.length && tks[i].id != "rparen") {
        const expr = parseExpr(tks, i);
        args.push(expr.node);
        i = expr.next;
        if(tks[i]?.id == "comma") i++;
    }
    if(tks[i]?.id != "rparen") throw new Error();
    return { args, next: i + 1 };
}
type ParsedCommaList = { list: NodeList } & Next;
function parseCommaList(tks: TokenList, i: number): ParsedCommaList {
    const list = [];
    let count = 1;
    while(i < tks.length && count > 0) {
        const expr = parseExpr(tks, i);
        list.push(expr.node);
        i = expr.next;
        if(tks[i]?.id == "comma") {
            count++;
        } else {
            count--;
        }
    }
    return { list, next: i };
}

function retrieveBlock(tks: TokenList, i: number) {
    let body = [];
    let depth = 0;
    i++;
    while(i < tks.length) {
        const tk = tks[i];
        if(tk.id == "lbrace") depth++;
        if(tk.id == "rbrace") depth--;
        if(depth == 0) break;
        body.push(tk);
        i++;
    }
    i++;
    if(depth > 0) throw new UnterminatedStatementError(tks[i-1], "block", "}");
    return body;
}
type BlockStmNode = MkNode<"BlockStm", Node[]>;
function parseBlock(body: TokenList): BlockStmNode {
    let parsed: Node[] = [];
    let i = 0;
    while(i < body.length) {
        const p = parseExpr(body, i);
        parsed.push(p.node);
        i = p.next;
    }
    return { node: { type: "BlockStm", val: parsed }, next: i };
}

export { parser };
export type { Parsed, Next, ParsedMemberExpr, ParsedCallExpr };