type TClassify = (value: number) => string;

const classify: TClassify = (value) =>
    value > 100 ? "high" : value > 50 ? "medium" : "low";

export { classify };
