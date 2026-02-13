import { useState } from "react";
import { Star } from "lucide-react";

const SAMPLE_REVIEWS = [
  {
    id: 1,
    user: "Maria Santos",
    vehicle: "Toyota Vios 2022",
    rating: 5,
    comment: "Very smooth transaction. Car was clean and well maintained!",
    date: "Feb 10, 2026",
    reply: "",
  },
  {
    id: 2,
    user: "John Dela Peña",
    vehicle: "Honda Click 160",
    rating: 4,
    comment: "Good experience overall, but pickup was slightly delayed.",
    date: "Feb 8, 2026",
    reply: "",
  },
  {
    id: 3,
    user: "Angela Cruz",
    vehicle: "Toyota Fortuner",
    rating: 2,
    comment: "Vehicle was okay but communication could be better.",
    date: "Feb 5, 2026",
    reply: "",
  },
];

/* ===========================
   MAIN COMPONENT
=========================== */
export default function Reviews() {
  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");

  /* UNIQUE VEHICLES */
  const vehicles = [
    "all",
    ...new Set(reviews.map((r) => r.vehicle)),
  ];

  /* FILTERED REVIEWS */
  const filteredReviews = reviews.filter((r) => {
    const ratingMatch =
      ratingFilter === "all"
        ? true
        : ratingFilter === "positive"
        ? r.rating >= 4
        : r.rating <= 3;

    const vehicleMatch =
      vehicleFilter === "all"
        ? true
        : r.vehicle === vehicleFilter;

    return ratingMatch && vehicleMatch;
  });

  /* AVERAGE RATING (based on fieter)*/
  const averageRating =
    filteredReviews.length > 0
      ? filteredReviews.reduce((s, r) => s + r.rating, 0) /
        filteredReviews.length
      : 0;

  const handleReply = (id, text) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, reply: text } : r
      )
    );
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-gray-500">
            All reviews from vehicles you posted
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-2">
          {/* VEHICLE FILTER */}
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            {vehicles.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All Vehicles" : v}
              </option>
            ))}
          </select>

          {/* RATING FILTER */}
          {["all", "positive", "negative"].map((f) => (
            <button
              key={f}
              onClick={() => setRatingFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm border ${
                ratingFilter === f
                  ? "bg-[#017FE6] text-white border-[#017FE6]"
                  : "hover:bg-gray-100"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "positive"
                ? "Positive"
                : "Negative"}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY */}
      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
        <div>
          <p className="text-4xl font-bold">
            {averageRating.toFixed(1)}
          </p>
          <div className="flex text-yellow-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                fill={i < Math.round(averageRating) ? "#FACC15" : "none"}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {filteredReviews.length} review(s)
          </p>
        </div>
      </div>

      {/* REVIEWS */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-xl shadow p-6 space-y-3"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{review.user}</p>
                <p className="text-sm text-gray-500">
                  {review.vehicle}
                </p>
              </div>
              <p className="text-xs text-gray-400">
                {review.date}
              </p>
            </div>

            {/* STARS */}
            <div className="flex text-yellow-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < review.rating ? "#FACC15" : "none"}
                />
              ))}
            </div>

            <p className="text-sm text-gray-700">
              {review.comment}
            </p>

            {/* OWNER REPLY */}
            {review.reply ? (
              <div className="bg-gray-50 border-l-4 border-[#017FE6] p-3 rounded">
                <p className="text-xs font-semibold text-[#017FE6]">
                  Your Reply
                </p>
                <p className="text-sm">{review.reply}</p>
              </div>
            ) : (
              <ReplyBox
                onSubmit={(text) =>
                  handleReply(review.id, text)
                }
              />
            )}
          </div>
        ))}

        {filteredReviews.length === 0 && (
          <p className="text-center text-gray-500">
            No reviews for this filter.
          </p>
        )}
      </div>
    </div>
  );
}

//* owner can reply
function ReplyBox({ onSubmit }) {
  const [text, setText] = useState("");

  return (
    <div className="mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply..."
        className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
        rows={2}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={() => {
            if (!text.trim()) return;
            onSubmit(text);
            setText("");
          }}
          className="bg-[#017FE6] text-white px-4 py-1.5 rounded-lg text-sm"
        >
          Reply
        </button>
      </div>
    </div>
  );
}
