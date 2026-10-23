// Example when fetching data for the logged-in user session:
const fetchUserAppointments = async () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("beautyvibe_user") || "{}");
    const userId = currentUser?.uid || currentUser?.id;
    const userEmail = currentUser?.email;

    if (!userId && !userEmail) {
      setAppointments([]); // No session = No data shown
      return;
    }

    // Passes unique user identifiers so the backend isolates records strictly to this account
    const res = await API.get(`/api/appointments?userId=${encodeURIComponent(userId || "")}&email=${encodeURIComponent(userEmail || "")}`);
    if (res.data?.success) {
      setAppointments(res.data.data);
    }
  } catch (err) {
    console.error("Failed to fetch user-specific appointments:", err);
  }
};

// Example when creating a new booking:
const handleBookService = async (serviceData) => {
  const currentUser = JSON.parse(localStorage.getItem("beautyvibe_user") || "{}");
  
  const payload = {
    userId: currentUser?.uid || currentUser?.id,
    user: {
      name: currentUser?.name || "Client",
      email: currentUser?.email
    },
    ...serviceData
  };

  await API.post("/api/appointments", payload);
};