/**
 * Fixture: max-total-depth violation.
 * Code indented beyond 3 levels triggers the
 * max-total-depth rule.
 */

type TItem = {
    id: number;
    active: boolean;
    tags: ReadonlyArray<string>;
};

type TResult = {
    matched: boolean;
    tag: string;
};

const findFirstActiveTag: (
    items: ReadonlyArray<TItem>,
    target: string,
) => TResult = (items, target) => {
    // depth 1: for loop
    for (const item of items) {
        // depth 2: if
        if (item.active) {
            // depth 3: for loop
            for (const tag of item.tags) {
                // depth 4: violation!
                if (tag === target) {
                    return {
                        matched: true,
                        tag,
                    };
                }
            }
        }
    }
    return {
        matched: false,
        tag: "",
    };
};

export { findFirstActiveTag };
