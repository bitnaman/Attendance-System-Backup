import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

function StudentRegistration() {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    roll_no: "",
    prn: "",
    seat_no: ""
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!image) {
      setMessage("❌ Please select an image");
      return;
    }

    setLoading(true);
    setMessage("Registering student...");

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Add image
      formDataToSend.append("image", image);

      const response = await fetch(`${API_BASE}/student/`, {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ Student ${formData.name} registered successfully!`);
        
        // Reset form
        setFormData({
          name: "",
          age: "",
          roll_no: "",
          prn: "",
          seat_no: ""
        });
        setImage(null);
        
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.error || "Registration failed"}`);
      }
    } catch (error) {
      setMessage("❌ Error: Could not connect to server. Make sure the backend is running.");
    }

    setLoading(false);
  };

  return (
    <div className="registration-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Age:</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Roll Number:</label>
          <input
            type="text"
            name="roll_no"
            value={formData.roll_no}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>PRN:</label>
          <input
            type="text"
            name="prn"
            value={formData.prn}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Seat Number:</label>
          <input
            type="text"
            name="seat_no"
            value={formData.seat_no}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Face Photo:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            required
            disabled={loading}
          />
          {image && (
            <div className="image-preview">
              <img 
                src={URL.createObjectURL(image)} 
                alt="Preview" 
                style={{maxWidth: "200px", maxHeight: "200px"}}
              />
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="register-btn"
        >
          {loading ? "🔄 Registering..." : "👤 Register Student"}
        </button>
      </form>

      {message && (
        <div className={`message ${message.includes("✅") ? "success" : "error"}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default StudentRegistration;
