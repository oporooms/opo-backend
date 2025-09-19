import { DefaultResponseBody } from "@/types/default";
import type { Request, Response } from "express";
import { SearchCityForHotelResponse } from "@/types/Hotel/index";
import BdsdHotelCityList from "@/schemas/Hotel/Search";
import { removeNoSqlInjection } from "@/functions";

export const searchCityForHotel = async (
    req: Request<{}, any, any, { city_name: string }>,
    res: Response<DefaultResponseBody<SearchCityForHotelResponse[]>>
) => {
    const { city_name = removeNoSqlInjection(req.query.city_name) } = req.query

    if (!city_name) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "City name is required"
            }
        });

        return
    }

    const rawQuery = String(city_name || "").trim();

    // allow numeric city id searches (even if shorter than 3 chars)
    if (!/^\d+$/.test(rawQuery) && rawQuery.length < 3) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "City name must be at least 3 characters" }
        });
        return;
    }

    const q = city_name.trim();
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixSlice = q.length >= 3 ? esc.slice(0, 3) : esc;
    const fullRegex = { $regex: esc, $options: "i" };
    const prefixRegex = { $regex: "^" + prefixSlice, $options: "i" };

    const orConditions: any[] = [
        // numeric city id search (exact)
        ...(/^\d+$/.test(q) ? [{ city_id: Number(q) }] : []),

        // first try to match the whole query (anywhere in the field)
        { destination: fullRegex },
        { state_province: fullRegex },
        { state_province_code: fullRegex },
        { country: fullRegex },
        { country_code: fullRegex },

        // if no full match, allow prefix (first 3 letters)
        { destination: prefixRegex },
        { state_province: prefixRegex },
        { state_province_code: prefixRegex },
        { country: prefixRegex }
    ];

    const result = await BdsdHotelCityList.aggregate([
        { $match: { $or: orConditions } },
        { $addFields: { _priority: { $cond: [{ $eq: ["$country", "India"] }, 2, 1] } } },
        { $sort: { _priority: -1 } },
        {
            $project: {
                _id: 0,
                cityId: "$city_id",
                city: "$destination",
                state: "$state_province",
                stateCode: "$state_province_code",
                country: "$country",
                countryCode: "$country_code"
            }
        }
    ])

    if (result.length === 0) {
        res.status(404).json({
            data: null,
            Status: { Code: 404, Message: "No results found" }
        });

        return
    }

    res.status(200).json({
        data: result,
        Status: { Code: 200, Message: "OK" }
    });

}