/**
 * Fixture: restrict-return-count violation.
 * A function with multiple return statements
 * triggers the restrict-return-count rule.
 */

type TGrade = "A" | "B" | "C" | "D" | "F";

const scoreToGrade: (
    score: number,
) => TGrade = (score) => {
    if (score >= 90) {
        return "A";
    }
    if (score >= 80) {
        return "B";
    }
    if (score >= 70) {
        return "C";
    }
    if (score >= 60) {
        return "D";
    }
    return "F";
};

export { scoreToGrade };
