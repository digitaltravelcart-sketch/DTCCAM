const store = require("./store");

// Given a hotel, room category, meal plan and a check-in date, find the
// active contract season covering that date and return the matching rate row.
function findRateForDate(hotelId, roomCategoryId, mealPlanCode, dateStr) {
  const date = new Date(dateStr);
  const contracts = store.where(
    "hotel_contracts",
    (c) => c.hotel_id === Number(hotelId) && new Date(c.valid_from) <= date && new Date(c.valid_to) >= date
  );
  for (const contract of contracts) {
    const seasons = store.where(
      "hotel_contract_seasons",
      (s) => s.hotel_contract_id === contract.id && new Date(s.date_from) <= date && new Date(s.date_to) >= date
    );
    for (const season of seasons) {
      const rate = store.where(
        "hotel_rates",
        (r) => r.season_id === season.id && r.room_category_id === Number(roomCategoryId) && r.meal_plan_code === mealPlanCode
      )[0];
      if (rate) return { rate, season, contract };
    }
  }
  return null;
}

// Computes cost for a hotel stay component. `adults` is the occupancy for
// this specific room (1 = single, uses SGL rate); children are split into
// those with a bed (CWB rate) and without one (CNB rate).
function computeHotelComponentCost(hotelId, roomCategoryId, mealPlanCode, checkIn, nights, adults, childrenWithBed, childrenNoBed) {
  const found = findRateForDate(hotelId, roomCategoryId, mealPlanCode, checkIn);
  if (!found) return null;
  const { rate } = found;
  let perNight;
  if (Number(adults) <= 1) {
    // Fall back to the double rate if no SGL rate was ever entered for this row.
    perNight = Number(rate.base_rate_single) || Number(rate.base_rate_double);
  } else {
    const extraAdults = Math.max(0, Number(adults) - 2);
    perNight = Number(rate.base_rate_double) + extraAdults * Number(rate.extra_adult_rate || 0);
  }
  perNight += Number(childrenWithBed || 0) * Number(rate.extra_child_wb_rate || 0);
  perNight += Number(childrenNoBed || 0) * Number(rate.extra_child_nb_rate || 0);
  const total = perNight * Number(nights);
  return {
    perNight,
    total,
    rateUsed: rate,
  };
}

function computeQuotationTotals(items, markupPct, discountAmt, gstPct) {
  const totalCost = items.reduce((s, i) => s + Number(i.total_cost || 0), 0);
  const markupAmt = totalCost * (Number(markupPct || 0) / 100);
  const preDiscount = totalCost + markupAmt;
  const afterDiscount = Math.max(0, preDiscount - Number(discountAmt || 0));
  const gstAmt = afterDiscount * (Number(gstPct || 0) / 100);
  const sellPrice = afterDiscount + gstAmt;
  const margin = afterDiscount - totalCost;
  const marginPct = afterDiscount > 0 ? (margin / afterDiscount) * 100 : 0;
  return { totalCost, markupAmt, gstAmt, sellPrice, margin, marginPct };
}

module.exports = { findRateForDate, computeHotelComponentCost, computeQuotationTotals };
