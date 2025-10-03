import { Bookings } from "@/types/Bookings";

const formatDate = (value?: Date | string | null) => {
	if (!value) {
		return "N/A";
	}

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "N/A";
	}

	return date.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};

const formatDateTime = (value?: Date | string | null) => {
	if (!value) {
		return "N/A";
	}

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "N/A";
	}

	return date.toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatCurrency = (amount?: number | null, currency = "INR") => {
	if (amount === undefined || amount === null || Number.isNaN(amount)) {
		return "N/A";
	}

	try {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency,
			minimumFractionDigits: 0,
		}).format(amount);
	} catch (error) {
		return `₹${amount.toFixed(2)}`;
	}
};

const formatDuration = (minutes?: number | null) => {
	if (minutes === undefined || minutes === null || Number.isNaN(minutes)) {
		return "N/A";
	}

	const totalMinutes = Math.max(0, Math.floor(minutes));
	const hours = Math.floor(totalMinutes / 60);
	const remainingMinutes = totalMinutes % 60;

	const parts: string[] = [];

	if (hours > 0) {
		parts.push(`${hours}h`);
	}

	parts.push(`${remainingMinutes}m`);

	return parts.join(" ");
};

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const safeText = (value: unknown) => {
	if (value === undefined || value === null || value === "") {
		return "N/A";
	}

	return escapeHtml(String(value));
};

export const BookingHotelTemplate = (bookingDetails: Bookings) => {
	const {
		bookingId,
		bookingDate,
		bookingType,
		bookingDetails: details,
		status,
		payment,
		gstDetails,
	} = bookingDetails;

	const hotelBooking = details.ifHotelBooked;
	const bdsdHotel = details.ifBdsdHotelBooked?.blockHotel;
	const outsideHotel = details.ifOutSideHotelBooked;

	const primaryHotelName =
		outsideHotel?.name ??
		bdsdHotel?.Result?.HotelName ??
		(hotelBooking?.hotelId ? `Hotel #${hotelBooking.hotelId}` : "Hotel Booking");

	const primaryAddress =
		outsideHotel?.address ??
		[bdsdHotel?.Result?.AddressLine1, bdsdHotel?.Result?.AddressLine2]
			.filter(Boolean)
			.join(", ") ??
		"N/A";

	const checkInDate = hotelBooking?.checkIn ?? outsideHotel?.checkIn ?? null;
	const checkOutDate = hotelBooking?.checkOut ?? outsideHotel?.checkOut ?? null;
	const totalNights =
		hotelBooking?.totalDays ?? outsideHotel?.totalDays ?? "N/A";

	const roomType =
		hotelBooking?.roomType ??
		bdsdHotel?.Result?.HotelRoomsDetails?.[0]?.RoomTypeName ??
		"Standard";

		const roomCount =
			hotelBooking?.rooms ??
			outsideHotel?.rooms ??
			bdsdHotel?.Result?.HotelRoomsDetails?.length ??
			"N/A";

		const adults =
			hotelBooking?.adults ??
			outsideHotel?.guests?.adults ??
			null;

		const children =
			hotelBooking?.childrens ??
			outsideHotel?.guests?.childrens ??
			(bdsdHotel?.Result?.HotelRoomsDetails
				? bdsdHotel.Result.HotelRoomsDetails.reduce(
						(acc, room) => acc + (room.ChildCount ?? 0),
						0,
					)
				: null);

		const guestSummary = [
			adults !== null ? `${safeText(adults)} Adults` : null,
			children && children > 0 ? `${safeText(children)} Children` : null,
		]
			.filter(Boolean)
			.join(", ") || "N/A";

		const bdsdRoomDetailsHtml = bdsdHotel?.Result?.HotelRoomsDetails
			? bdsdHotel.Result.HotelRoomsDetails.map((room, index) => {
					const roomPrice = formatCurrency(
						room.Price?.OfferedPrice ?? room.Price?.RoomPrice,
					);
					const amenities = room.Amenities?.length
						? room.Amenities.slice(0, 6)
								.map((amenity) => `<span class="tag">${safeText(amenity)}</span>`)
								.join("")
						: "<span class=\"muted\">No amenities listed</span>";

					return `<div class="room-card">
						<div class="room-header">
							<span class="room-index">Room ${index + 1}</span>
							<span class="room-price">${roomPrice}</span>
						</div>
						<div class="room-body">
							<div><strong>${safeText(room.RoomTypeName)}</strong></div>
							<div class="muted">${safeText(room.RoomDescription)}</div>
							<div class="tags">${amenities}</div>
						</div>
					</div>`;
				}).join("")
			: "";

		const showBdsdRooms = bdsdRoomDetailsHtml !== "";

	const assignedRoomsHtml =
		Array.isArray(hotelBooking?.assignedRooms) &&
		hotelBooking?.assignedRooms?.length
			? `<div class="card">
					<h3>Assigned Rooms</h3>
					<ul class="list">
						${hotelBooking.assignedRooms
							.map((item, index) => `<li><strong>Room ${index + 1}:</strong> ${safeText(
								typeof item === "string" || typeof item === "number"
									? item
									: JSON.stringify(item),
							)}</li>`)
							.join("")}
					</ul>
				</div>`
			: "";

	return `<!doctype html>
	<html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width,initial-scale=1" />
			<title>Hotel Booking Details</title>
			<style>
				body { font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
				.wrapper { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
				.header { display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
				.header h1 { margin: 0; font-size: 24px; }
				.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
				.badge.status { background: #eef2ff; color: #312e81; }
				.badge.type { background: #dcfce7; color: #166534; }
				.section { margin-bottom: 28px; }
				.section h2 { margin: 0 0 12px; font-size: 18px; }
				.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
				.info-card { background: #f1f5f9; border-radius: 12px; padding: 14px; }
				.info-card .label { font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; display: block; margin-bottom: 6px; }
				.info-card .value { font-size: 15px; font-weight: 600; color: #0f172a; }
				.card { background: #f9fafb; border-radius: 12px; padding: 18px; box-shadow: inset 0 0 0 1px #e2e8f0; }
				.card h3 { margin: 0 0 8px; font-size: 16px; }
				.muted { color: #64748b; font-size: 13px; }
				.list { padding-left: 18px; margin: 12px 0 0; color: #0f172a; }
				.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
				.tag { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
				.room-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-top: 12px; }
				.room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; }
				.room-index { font-weight: 600; color: #0f172a; }
				.room-price { font-weight: 700; color: #1e40af; }
				.footer-note { font-size: 12px; color: #64748b; text-align: center; margin-top: 32px; }
				@media (max-width: 600px) {
					.wrapper { padding: 20px; }
					.header h1 { font-size: 20px; }
				}
			</style>
		</head>
		<body>
			<div class="wrapper">
				<div class="header">
					<h1>${safeText(primaryHotelName)}</h1>
					<div class="muted">${safeText(primaryAddress)}</div>
					<div style="display:flex;gap:8px;flex-wrap:wrap;">
						<span class="badge status">${safeText(status)}</span>
						<span class="badge type">${safeText(bookingType)}</span>
					</div>
					<div class="muted">Booking ID: ${safeText(bookingId ?? "N/A")} • Created ${formatDateTime(bookingDate)}</div>
				</div>

				<div class="section">
					<h2>Stay Summary</h2>
					<div class="grid">
						<div class="info-card"><span class="label">Check-in</span><span class="value">${formatDate(checkInDate)}</span></div>
						<div class="info-card"><span class="label">Check-out</span><span class="value">${formatDate(checkOutDate)}</span></div>
						<div class="info-card"><span class="label">Nights</span><span class="value">${safeText(totalNights)}</span></div>
						<div class="info-card"><span class="label">Room Type</span><span class="value">${safeText(roomType)}</span></div>
						<div class="info-card"><span class="label">Rooms</span><span class="value">${safeText(roomCount)}</span></div>
						<div class="info-card"><span class="label">Guests</span><span class="value">${guestSummary}</span></div>
					</div>
				</div>

				${assignedRoomsHtml}

			${showBdsdRooms ? `<div class="section"><h2>Room Details</h2>${bdsdRoomDetailsHtml}</div>` : ""}

				<div class="section">
					<h2>Payment Summary</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">Base Cost</span><span class="value">${formatCurrency(payment?.cost)}</span></div>
							<div class="info-card"><span class="label">Fees</span><span class="value">${formatCurrency(payment?.fee)}</span></div>
							<div class="info-card"><span class="label">Total</span><span class="value">${formatCurrency(payment?.total)}</span></div>
							<div class="info-card"><span class="label">Payment Mode</span><span class="value">${safeText(payment?.mode)}</span></div>
							<div class="info-card"><span class="label">Payment Status</span><span class="value">${safeText(payment?.status)}</span></div>
							<div class="info-card"><span class="label">Transaction ID</span><span class="value">${safeText(payment?.transactionDetails?.id)}</span></div>
							<div class="info-card"><span class="label">Transaction Date</span><span class="value">${formatDateTime(payment?.transactionDetails?.date)}</span></div>
							<div class="info-card"><span class="label">Order Reference</span><span class="value">${safeText(payment?.transactionDetails?.orderId)}</span></div>
						</div>
					</div>
				</div>

				<div class="section">
					<h2>GST Information</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">GST Number</span><span class="value">${safeText(gstDetails?.gstNo)}</span></div>
							<div class="info-card"><span class="label">Registered Name</span><span class="value">${safeText(gstDetails?.gstName)}</span></div>
							<div class="info-card"><span class="label">State</span><span class="value">${safeText(gstDetails?.gstAddress?.state)}</span></div>
							<div class="info-card"><span class="label">Pincode</span><span class="value">${safeText(gstDetails?.gstAddress?.pincode)}</span></div>
						</div>
						<div class="muted" style="margin-top:12px;">${safeText(gstDetails?.gstAddress?.address)}</div>
					</div>
				</div>

				<div class="section">
					<h2>Company Approval</h2>
					<div class="card">
						<div class="info-card" style="background:#fff;border-radius:8px;box-shadow:none;">
							<span class="label">Approval Status</span>
							<span class="value">${safeText(details.companyApproval)}</span>
						</div>
					</div>
				</div>

				<div class="footer-note">Need help? Reply to this email and our travel desk will get right back to you.</div>
			</div>
		</body>
	</html>`;
};

export const BookingFlightTemplate = (bookingDetails: Bookings) => {
	const {
		bookingId,
		bookingDate,
		status,
		bookingType,
		payment,
		gstDetails,
	} = bookingDetails;

	const flightBooking = bookingDetails.bookingDetails.ifFlightBooked;

	if (!flightBooking) {
		return `<!doctype html>
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<title>Flight Booking Details</title>
				<style>
					body { font-family: Arial, Helvetica, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#0f172a; }
					.wrapper { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); text-align:center; }
					.muted { color:#64748b; font-size:14px; }
				</style>
			</head>
			<body>
				<div class="wrapper">
					<h1>Flight booking details unavailable</h1>
					<p class="muted">We couldn't find any flight information for this reservation.</p>
				</div>
			</body>
		</html>`;
	}

	const {
		travellers = [],
		selectedMeal = [],
		selectedBaggage = [],
		selectedSeats = [],
		fareConfirmation,
		bookingResult,
	} = flightBooking;

	const segmentGroups =
		fareConfirmation?.Result?.Segments ?? bookingResult?.Result?.Segments ?? [];

	const segments = Array.isArray(segmentGroups)
		? segmentGroups.reduce<any[]>((acc, group) => {
			if (Array.isArray(group)) {
				return acc.concat(group.filter(Boolean));
			}
			return acc;
		}, [])
		: [];

	const firstSegment: any = segments[0] ?? null;
	const lastSegment: any = segments.length ? segments[segments.length - 1] : null;

	const originLabel = firstSegment?.Origin?.CityName ?? firstSegment?.Origin?.AirportCode ?? bookingResult?.Result?.Origin ?? "Origin";
	const destinationLabel = lastSegment?.Destination?.CityName ?? lastSegment?.Destination?.AirportCode ?? bookingResult?.Result?.Destination ?? "Destination";
	const pnr = bookingResult?.Result?.PNR ?? "Pending";
	const validatingAirline = fareConfirmation?.Result?.ValidatingAirline ?? bookingResult?.Result?.ValidatingAirlineCode;
	const airlineName = firstSegment?.Airline?.AirlineName ?? validatingAirline ?? "Flight";
	const journeyDate = firstSegment?.Origin?.DepartTime ?? bookingResult?.Result?.InvoiceCreatedOn ?? bookingDate;

	const itineraryHtml = segments.length
		? segments
				.map((segment, index) => {
					const origin = segment?.Origin ?? {};
					const destination = segment?.Destination ?? {};
					const airline = segment?.Airline ?? {};
					const departTime = formatDateTime(origin?.DepartTime ?? origin?.DepartureTime ?? null);
					const arriveTime = formatDateTime(destination?.ArrivalTime ?? null);
					const legDuration = formatDuration(segment?.Duration ?? segment?.TotalDuration);
					const baggageAllowance = safeText(segment?.CheckInBaggage ?? "As per ticket");
					const cabinBaggage = safeText(segment?.CabinBaggage ?? "As per ticket");

					return `<div class="segment-card">
						<div class="segment-index">Leg ${index + 1}</div>
						<div class="segment-main">
							<div class="segment-route">
								<div>
									<div class="airport">${safeText(origin?.CityName ?? origin?.AirportName ?? origin?.AirportCode ?? "Origin")}</div>
									<div class="code">${safeText(origin?.AirportCode ?? "---")}</div>
									<div class="time">${departTime}</div>
								</div>
								<div class="segment-arrow">➜</div>
								<div>
									<div class="airport">${safeText(destination?.CityName ?? destination?.AirportName ?? destination?.AirportCode ?? "Destination")}</div>
									<div class="code">${safeText(destination?.AirportCode ?? "---")}</div>
									<div class="time">${arriveTime}</div>
								</div>
							</div>
							<div class="segment-meta">
								<div>${safeText(airline?.AirlineName ?? airlineName)} • ${safeText(airline?.AirlineCode ?? "")}${airline?.FlightNumber ? ` ${safeText(airline.FlightNumber)}` : ""}</div>
								<div class="muted">Cabin: ${safeText(segment?.CabinClass ?? "N/A")} • Duration: ${legDuration}</div>
								<div class="tag-row">
									<span class="tag">Check-in: ${baggageAllowance}</span>
									<span class="tag">Cabin: ${cabinBaggage}</span>
								</div>
							</div>
						</div>
					</div>`;
				})
				.join("")
		: '<div class="muted">Itinerary details are not available for this booking.</div>';

	const passengerRows = travellers.length
		? travellers
				.map((traveller, index) => {
					const paxTypeLabel = (() => {
						switch (traveller?.PaxType) {
							case 1:
								return "Adult";
							case 2:
								return "Child";
							case 3:
								return "Infant";
							default:
								return "Passenger";
						}
					})();
					const genderLabel = (() => {
						switch (traveller?.Gender) {
							case 1:
								return "Male";
							case 2:
								return "Female";
							default:
								return "Other";
						}
					})();
					return `<tr>
						<td>${safeText(`${index + 1}. ${traveller?.Title ?? ""} ${traveller?.FirstName ?? ""} ${traveller?.LastName ?? ""}`.trim())}</td>
						<td>${safeText(paxTypeLabel)}</td>
						<td>${formatDate(traveller?.DateOfBirth ?? null)}</td>
						<td>${safeText(genderLabel)}</td>
						<td>${safeText(traveller?.ContactNo ?? traveller?.Email ?? "N/A")}</td>
						<td>${traveller?.IsLeadPax ? '<span class="tag tag-solid">Lead</span>' : ""}</td>
					</tr>`;
				})
				.join("")
		: '<tr><td colspan="6" class="muted">No passenger details available.</td></tr>';

	const baggageHtml = selectedBaggage.length
		? selectedBaggage
				.filter(Boolean)
				.map((item) => `<li><strong>${safeText(item?.Weight ?? "N/A")}</strong> • ${formatCurrency(item?.Price)} • ${safeText(item?.Origin ?? "")} → ${safeText(item?.Destination ?? "")}</li>`)
				.join("")
		: '<li class="muted">No additional baggage selected.</li>';

	const mealHtml = selectedMeal.length
		? selectedMeal
				.filter(Boolean)
				.map((item) => `<li><strong>${safeText(item?.AirlineDescription ?? item?.Description ?? "Meal")}</strong> • ${formatCurrency(item?.Price)}</li>`)
				.join("")
		: '<li class="muted">No meals selected.</li>';

	const seatHtml = selectedSeats.length
		? selectedSeats
				.filter(Boolean)
				.map((seat) => `<li><strong>${safeText(seat?.SeatNo ?? "Seat")}</strong> • ${safeText(seat?.SeatClass ?? "Class")}${seat?.Price ? ` • ${formatCurrency(seat.Price, seat.Currency ?? "INR")}` : ""}</li>`)
				.join("")
		: '<li class="muted">No seats pre-selected.</li>';

	const fare = fareConfirmation?.Result?.Fare ?? bookingResult?.Result?.Fare;

	return `<!doctype html>
	<html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width,initial-scale=1" />
			<title>Flight Booking Details</title>
			<style>
				body { font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
				.wrapper { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
				.header { display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
				.header h1 { margin: 0; font-size: 24px; }
				.header .route { font-size: 18px; font-weight: 600; }
				.badges { display: flex; flex-wrap: wrap; gap: 8px; }
				.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
				.badge.status { background: #eef2ff; color: #312e81; }
				.badge.type { background: #dcfce7; color: #166534; }
				.badge.secondary { background: #e0f2fe; color: #035388; }
				.section { margin-bottom: 28px; }
				.section h2 { margin: 0 0 12px; font-size: 18px; }
				.muted { color: #64748b; font-size: 13px; }
				.segment-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
				.segment-index { font-size: 12px; text-transform: uppercase; color: #1e293b; font-weight: 600; margin-bottom: 8px; }
				.segment-main { display: flex; flex-direction: column; gap: 12px; }
				.segment-route { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
				.segment-route .airport { font-weight: 600; font-size: 16px; }
				.segment-route .code { color: #334155; font-size: 13px; text-transform: uppercase; }
				.segment-route .time { color: #1f2937; font-size: 14px; margin-top: 4px; }
				.segment-arrow { font-size: 20px; color: #6366f1; }
				.segment-meta { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
				.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
				.tag { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
				.tag-solid { background: #312e81; color: #f1f5f9; }
				table { width: 100%; border-collapse: collapse; }
				thead { background: #f1f5f9; }
				thead th { text-align: left; padding: 10px; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; }
				tbody td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
				tbody tr:last-child td { border-bottom: none; }
				.addon-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
				.card { background: #f9fafb; border-radius: 12px; padding: 18px; box-shadow: inset 0 0 0 1px #e2e8f0; }
				.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
				.info-card { background: #f1f5f9; border-radius: 12px; padding: 14px; }
				.info-card .label { font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; display: block; margin-bottom: 6px; }
				.info-card .value { font-size: 15px; font-weight: 600; color: #0f172a; }
				.footer-note { font-size: 12px; color: #64748b; text-align: center; margin-top: 32px; }
				@media (max-width: 600px) {
					.wrapper { padding: 20px; }
					.header h1 { font-size: 20px; }
					.segment-route { gap: 12px; }
				}
			</style>
		</head>
		<body>
			<div class="wrapper">
				<div class="header">
					<h1>${safeText(airlineName)}</h1>
					<div class="route">${safeText(originLabel)} → ${safeText(destinationLabel)}</div>
					<div class="muted">Journey Date: ${formatDateTime(journeyDate)}</div>
					<div class="badges">
						<span class="badge status">${safeText(status)}</span>
						<span class="badge type">${safeText(bookingType)}</span>
						<span class="badge secondary">PNR ${safeText(pnr)}</span>
					</div>
					<div class="muted">Booking ID: ${safeText(bookingId ?? "N/A")} • Created ${formatDateTime(bookingDate)}</div>
				</div>

				<div class="section">
					<h2>Flight Itinerary</h2>
					${itineraryHtml}
				</div>

				<div class="section">
					<h2>Passengers</h2>
					<div class="card" style="padding:0; overflow:hidden;">
						<table>
							<thead>
								<tr>
									<th>Passenger</th>
									<th>Type</th>
									<th>DOB</th>
									<th>Gender</th>
									<th>Contact</th>
									<th></th>
								</tr>
							</thead>
							<tbody>${passengerRows}</tbody>
						</table>
					</div>
				</div>

				<div class="section">
					<h2>Add-ons</h2>
					<div class="grid">
						<div class="card">
							<h3>Baggage</h3>
							<ul class="addon-list">${baggageHtml}</ul>
						</div>
						<div class="card">
							<h3>Meals</h3>
							<ul class="addon-list">${mealHtml}</ul>
						</div>
						<div class="card">
							<h3>Seats</h3>
							<ul class="addon-list">${seatHtml}</ul>
						</div>
					</div>
				</div>

				<div class="section">
					<h2>Fare Summary</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">Base Fare</span><span class="value">${formatCurrency(fare?.BaseFare)}</span></div>
							<div class="info-card"><span class="label">Taxes & Fees</span><span class="value">${formatCurrency(fare ? (fare.Tax ?? 0) + (fare.OtherCharges ?? 0) : null)}</span></div>
							<div class="info-card"><span class="label">Discount</span><span class="value">${formatCurrency(fare?.Discount)}</span></div>
							<div class="info-card"><span class="label">Offered Price</span><span class="value">${formatCurrency(fare?.OfferedPrice)}</span></div>
							<div class="info-card"><span class="label">Published Price</span><span class="value">${formatCurrency(fare?.PublishedPrice)}</span></div>
							<div class="info-card"><span class="label">Fare Type</span><span class="value">${safeText(fareConfirmation?.Result?.FareType ?? bookingResult?.Result?.FareType ?? "N/A")}</span></div>
						</div>
					</div>
				</div>

				<div class="section">
					<h2>Payment Summary</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">Base Cost</span><span class="value">${formatCurrency(payment?.cost)}</span></div>
							<div class="info-card"><span class="label">Fees</span><span class="value">${formatCurrency(payment?.fee)}</span></div>
							<div class="info-card"><span class="label">Total</span><span class="value">${formatCurrency(payment?.total)}</span></div>
							<div class="info-card"><span class="label">Payment Mode</span><span class="value">${safeText(payment?.mode)}</span></div>
							<div class="info-card"><span class="label">Payment Status</span><span class="value">${safeText(payment?.status)}</span></div>
							<div class="info-card"><span class="label">Transaction ID</span><span class="value">${safeText(payment?.transactionDetails?.id)}</span></div>
							<div class="info-card"><span class="label">Transaction Date</span><span class="value">${formatDateTime(payment?.transactionDetails?.date)}</span></div>
							<div class="info-card"><span class="label">Order Reference</span><span class="value">${safeText(payment?.transactionDetails?.orderId)}</span></div>
						</div>
					</div>
				</div>

				<div class="section">
					<h2>GST Information</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">GST Number</span><span class="value">${safeText(gstDetails?.gstNo)}</span></div>
							<div class="info-card"><span class="label">Registered Name</span><span class="value">${safeText(gstDetails?.gstName)}</span></div>
							<div class="info-card"><span class="label">State</span><span class="value">${safeText(gstDetails?.gstAddress?.state)}</span></div>
							<div class="info-card"><span class="label">Pincode</span><span class="value">${safeText(gstDetails?.gstAddress?.pincode)}</span></div>
						</div>
						<div class="muted" style="margin-top:12px;">${safeText(gstDetails?.gstAddress?.address)}</div>
					</div>
				</div>

				<div class="section">
					<h2>Company Approval</h2>
					<div class="card">
						<div class="info-card" style="background:#fff;border-radius:8px;box-shadow:none;">
							<span class="label">Approval Status</span>
							<span class="value">${safeText(bookingDetails.bookingDetails.companyApproval)}</span>
						</div>
					</div>
				</div>

				<div class="footer-note">Need help? Reply to this email and our flight desk will get right back to you.</div>
			</div>
		</body>
	</html>`;
};

export const BookingBusTemplate = (bookingDetails: Bookings) => {
	const {
		bookingId,
		bookingDate,
		status,
		bookingType,
		payment,
		gstDetails,
	} = bookingDetails;

	const busBooking = bookingDetails.bookingDetails.ifBusBooked;

	if (!busBooking) {
		return `<!doctype html>
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<title>Bus Booking Details</title>
				<style>
					body { font-family: Arial, Helvetica, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#0f172a; }
					.wrapper { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); text-align:center; }
					.muted { color:#64748b; font-size:14px; }
				</style>
			</head>
			<body>
				<div class="wrapper">
					<h1>Bus booking details unavailable</h1>
					<p class="muted">We couldn't find any bus information for this reservation.</p>
				</div>
			</body>
		</html>`;
	}

	const {
		travellers = [],
		blockSeat,
		bookingResult,
	} = busBooking;

	const blockResult = blockSeat?.Result;
	const bookingInfo = bookingResult?.Result;

	const origin = bookingInfo?.Origin ?? blockResult?.BoardingPointdetails?.CityPointLocation ?? "Origin";
	const destination = bookingInfo?.Destination ?? travellers?.[0]?.Seat?.SeatName ?? "Destination";
	const operatorName = bookingInfo?.TravelName ?? blockResult?.TravelName ?? "Bus Operator";
	const busType = bookingInfo?.BusType ?? blockResult?.BusType ?? "Bus";
	const departureTime = bookingInfo?.DepartureTime ?? blockResult?.DepartureTime ?? null;
	const arrivalTime = bookingInfo?.ArrivalTime ?? blockResult?.ArrivalTime ?? null;
	const journeyDate = bookingInfo?.DateOfJourney ?? bookingDate;
	const durationMinutes = bookingInfo?.Duration ?? null;
	const seatCount = bookingInfo?.NoOfSeats ?? travellers?.length ?? "N/A";
	const ticketNo = bookingInfo?.TicketNo ?? "Pending";
	const boardingPoint = bookingInfo?.BoardingPointdetails ?? blockResult?.BoardingPointdetails;
	const droppingPoint = bookingInfo?.DroppingPointdetails;

	const passengerRows = travellers.length
		? travellers
				.map((passenger, index) => {
					const genderLabel = (() => {
						switch (passenger?.Gender) {
							case 0:
								return "Female";
							case 1:
								return "Male";
							default:
								return "Other";
						}
					})();
					return `<tr>
						<td>${safeText(`${index + 1}. ${passenger?.Title ?? ""} ${passenger?.FirstName ?? ""} ${passenger?.LastName ?? ""}`.trim())}</td>
						<td>${safeText(passenger?.Seat?.SeatName ?? passenger?.Seat?.SeatIndex ?? "-")}</td>
						<td>${safeText(passenger?.Age ?? "-")}</td>
						<td>${safeText(genderLabel)}</td>
						<td>${safeText(passenger?.Phoneno ?? passenger?.Email ?? "N/A")}</td>
						<td>${passenger?.LeadPassenger ? '<span class="tag tag-solid">Lead</span>' : ""}</td>
					</tr>`;
				})
				.join("")
		: '<tr><td colspan="6" class="muted">No passenger details available.</td></tr>';

	const cancelPolicies = blockResult?.CancelPolicy ?? [];
	const cancelPolicyRows = cancelPolicies.length
		? cancelPolicies
				.map((policy, index) => `<tr>
					<td>${index + 1}</td>
					<td>${safeText(policy?.PolicyString ?? "Policy")}</td>
					<td>${safeText(policy?.TimeBeforeDept ?? "-")}</td>
					<td>${formatCurrency(policy?.CancellationCharge)}</td>
				</tr>`)
				.join("")
		: '<tr><td colspan="4" class="muted">Cancellation policy details are not available.</td></tr>';

	return `<!doctype html>
	<html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width,initial-scale=1" />
			<title>Bus Booking Details</title>
			<style>
				body { font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
				.wrapper { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
				.header { display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
				.header h1 { margin: 0; font-size: 24px; }
				.header .route { font-size: 18px; font-weight: 600; }
				.badges { display: flex; flex-wrap: wrap; gap: 8px; }
				.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
				.badge.status { background: #fef3c7; color: #92400e; }
				.badge.type { background: #dcfce7; color: #166534; }
				.badge.secondary { background: #e0f2fe; color: #0369a1; }
				.section { margin-bottom: 28px; }
				.section h2 { margin: 0 0 12px; font-size: 18px; }
				.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
				.info-card { background: #f1f5f9; border-radius: 12px; padding: 14px; }
				.info-card .label { font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; display: block; margin-bottom: 6px; }
				.info-card .value { font-size: 15px; font-weight: 600; color: #0f172a; }
				.card { background: #f9fafb; border-radius: 12px; padding: 18px; box-shadow: inset 0 0 0 1px #e2e8f0; }
				.list { padding-left: 20px; margin: 0; color: #0f172a; }
				.muted { color: #64748b; font-size: 13px; }
				table { width: 100%; border-collapse: collapse; }
				thead { background: #f1f5f9; }
				thead th { text-align: left; padding: 10px; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; }
				tbody td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
				tbody tr:last-child td { border-bottom: none; }
				.tag { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
				.tag-solid { background: #166534; color: #f1f5f9; }
				.footer-note { font-size: 12px; color: #64748b; text-align: center; margin-top: 32px; }
				@media (max-width: 600px) {
					.wrapper { padding: 20px; }
					.header h1 { font-size: 20px; }
				}
			</style>
		</head>
		<body>
			<div class="wrapper">
				<div class="header">
					<h1>${safeText(operatorName)}</h1>
					<div class="route">${safeText(origin)} → ${safeText(destination)}</div>
					<div class="muted">Journey Date: ${formatDate(journeyDate)}</div>
					<div class="badges">
						<span class="badge status">${safeText(status)}</span>
						<span class="badge type">${safeText(bookingType)}</span>
						<span class="badge secondary">Ticket ${safeText(ticketNo)}</span>
					</div>
					<div class="muted">Booking ID: ${safeText(bookingId ?? "N/A")} • Created ${formatDateTime(bookingDate)}</div>
				</div>

				<div class="section">
					<h2>Journey Details</h2>
					<div class="grid">
						<div class="info-card"><span class="label">Departure</span><span class="value">${formatDateTime(departureTime)}</span></div>
						<div class="info-card"><span class="label">Arrival</span><span class="value">${formatDateTime(arrivalTime)}</span></div>
						<div class="info-card"><span class="label">Duration</span><span class="value">${formatDuration(durationMinutes)}</span></div>
						<div class="info-card"><span class="label">Bus Type</span><span class="value">${safeText(busType)}</span></div>
						<div class="info-card"><span class="label">Operator</span><span class="value">${safeText(operatorName)}</span></div>
						<div class="info-card"><span class="label">Seats</span><span class="value">${safeText(seatCount)}</span></div>
					</div>
				</div>

				<div class="section">
					<h2>Passengers</h2>
					<div class="card" style="padding:0; overflow:hidden;">
						<table>
							<thead>
								<tr>
									<th>Passenger</th>
									<th>Seat</th>
									<th>Age</th>
									<th>Gender</th>
									<th>Contact</th>
									<th></th>
								</tr>
							</thead>
							<tbody>${passengerRows}</tbody>
						</table>
					</div>
				</div>

				<div class="section">
					<h2>Boarding & Drop</h2>
					<div class="grid">
						<div class="card">
							<h3>Boarding Point</h3>
							<ul class="list">
								<li><strong>${safeText(boardingPoint?.CityPointName ?? "Location")}</strong></li>
								<li>${safeText(boardingPoint?.CityPointAddress ?? boardingPoint?.CityPointLocation ?? "")}</li>
								<li>${safeText(boardingPoint?.CityPointLandmark ?? "")}</li>
								<li>Time: ${formatDateTime(boardingPoint?.CityPointTime ?? departureTime)}</li>
							</ul>
						</div>
						<div class="card">
							<h3>Dropping Point</h3>
							<ul class="list">
								<li><strong>${safeText(droppingPoint?.CityPointName ?? "Location")}</strong></li>
								<li>${safeText(droppingPoint?.CityPointLocation ?? "")}</li>
								<li>Time: ${formatDateTime(droppingPoint?.CityPointTime ?? arrivalTime)}</li>
							</ul>
						</div>
					</div>
				</div>

				<div class="section">
					<h2>Cancellation Policy</h2>
					<div class="card" style="padding:0; overflow:hidden;">
						<table>
							<thead>
								<tr>
									<th>#</th>
									<th>Policy</th>
									<th>Time Before Departure</th>
									<th>Charge</th>
								</tr>
							</thead>
							<tbody>${cancelPolicyRows}</tbody>
						</table>
					</div>
				</div>

				<div class="section">
					<h2>Payment Summary</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">Base Cost</span><span class="value">${formatCurrency(payment?.cost)}</span></div>
							<div class="info-card"><span class="label">Fees</span><span class="value">${formatCurrency(payment?.fee)}</span></div>
							<div class="info-card"><span class="label">Total</span><span class="value">${formatCurrency(payment?.total)}</span></div>
							<div class="info-card"><span class="label">Payment Mode</span><span class="value">${safeText(payment?.mode)}</span></div>
							<div class="info-card"><span class="label">Payment Status</span><span class="value">${safeText(payment?.status)}</span></div>
							<div class="info-card"><span class="label">Transaction ID</span><span class="value">${safeText(payment?.transactionDetails?.id)}</span></div>
							<div class="info-card"><span class="label">Transaction Date</span><span class="value">${formatDateTime(payment?.transactionDetails?.date)}</span></div>
							<div class="info-card"><span class="label">Order Reference</span><span class="value">${safeText(payment?.transactionDetails?.orderId)}</span></div>
						</div>
					</div>
				</div>

				<div class="section">
					<h2>GST Information</h2>
					<div class="card">
						<div class="grid">
							<div class="info-card"><span class="label">GST Number</span><span class="value">${safeText(gstDetails?.gstNo)}</span></div>
							<div class="info-card"><span class="label">Registered Name</span><span class="value">${safeText(gstDetails?.gstName)}</span></div>
							<div class="info-card"><span class="label">State</span><span class="value">${safeText(gstDetails?.gstAddress?.state)}</span></div>
							<div class="info-card"><span class="label">Pincode</span><span class="value">${safeText(gstDetails?.gstAddress?.pincode)}</span></div>
						</div>
						<div class="muted" style="margin-top:12px;">${safeText(gstDetails?.gstAddress?.address)}</div>
					</div>
				</div>

				<div class="section">
					<h2>Company Approval</h2>
					<div class="card">
						<div class="info-card" style="background:#fff;border-radius:8px;box-shadow:none;">
							<span class="label">Approval Status</span>
							<span class="value">${safeText(bookingDetails.bookingDetails.companyApproval)}</span>
						</div>
					</div>
				</div>

				<div class="footer-note">Need help? Reply to this email and our travel desk will get right back to you.</div>
			</div>
		</body>
	</html>`;
};