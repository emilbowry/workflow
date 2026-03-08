type TAddArgs = [left: number, right: number];
type TAdd = (...args: TAddArgs) => number;

const add: TAdd = (left, right) => left + right;

export { add };
