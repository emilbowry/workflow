type TClassifyArgs = [value: number];
type TClassify = (...args: TClassifyArgs) => string;

const classify: TClassify = (value) =>
    value > 100 ? "high" : value > 50 ? "medium" : "low";

export { classify };
