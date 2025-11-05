
export const getDuration = (startedAt:string, endedAt:string) => {
    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(endedAt).getTime();
    const duration = endTime - startTime;
    return duration;
}