import Counter from "@/schemas/Counter";

export const getNextId = async ({ id }: {
    id: string
}) => {
    const counter = await Counter.findOneAndUpdate(
        { id },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (counter.seq === 1) {
        counter.seq = 10000;
        await counter.save();
    }
    return counter.seq;
};
