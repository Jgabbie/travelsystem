export const buildVisaStatusTotalDaysMapFromSteps = (steps = []) => {
    const cumulativeMap = {};
    let runningTotal = 0;

    for (const step of steps) {
        const title = typeof step === 'string' ? step : String(step?.title || '').trim();
        if (!title) continue;

        const rawDays = typeof step === 'object' && step !== null
            ? (step.daysToBeCompleted ?? step.days ?? 0)
            : 0;
        const parsedDays = Number(rawDays);
        const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 0;

        runningTotal += safeDays;
        cumulativeMap[title] = runningTotal;
    }

    return cumulativeMap;
};

export const normalizeVisaProcessSteps = (processSteps = {}) => {
    if (!processSteps || typeof processSteps !== 'object' || Array.isArray(processSteps)) {
        return [];
    }

    return Object.entries(processSteps)
        .filter(([title, value]) => Boolean(title) && value && typeof value === 'object')
        .map(([title, value], index) => ({
            title,
            description: value.description || title,
            setDate: value.setDate || null,
            deadlineDate: value.deadlineDate || null,
            order: index,
        }));
};