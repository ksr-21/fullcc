export const transformUpdate = (updateData) => {
    const mongoUpdate = {};
    const setQuery = {};
    const addToSetQuery = {};
    const pullQuery = {};

    for (const [key, value] of Object.entries(updateData)) {
        if (value && typeof value === 'object' && value.__op) {
            if (value.__op === 'arrayUnion') {
                addToSetQuery[key] = { $each: Array.isArray(value.value) ? value.value : [value.value] };
            } else if (value.__op === 'arrayRemove') {
                pullQuery[key] = { $in: Array.isArray(value.value) ? value.value : [value.value] };
            } else if (value.__op === 'delete') {
                if (!mongoUpdate.$unset) mongoUpdate.$unset = {};
                mongoUpdate.$unset[key] = "";
                continue;
            }
        } else {
            // Handle nested fields like 'reactions.like'
            setQuery[key] = value;
        }
    }

    if (Object.keys(setQuery).length > 0) mongoUpdate.$set = setQuery;
    if (Object.keys(addToSetQuery).length > 0) mongoUpdate.$addToSet = addToSetQuery;
    if (Object.keys(pullQuery).length > 0) mongoUpdate.$pull = pullQuery;

    return mongoUpdate;
};
