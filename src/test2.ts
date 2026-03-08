type TClassify = (value: number) => string;

const classify: TClassify = (value) => {
    if (value > 100) {
        return "high";
    }
    if (value > 50) {
        return "medium";
    }
    return "low";
};

export { classify };
