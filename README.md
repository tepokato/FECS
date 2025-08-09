# FedEx Equipment Check-Out System (FECS)

A lightweight, browser-based web application to manage FedEx equipment check-outs and returns. Designed for operations teams to track users and equipment efficiently without requiring backend integration.

🚀 Features

🔍 Barcode-based equipment check-out

🧑 Employee badge scan support

🧰 Custom equipment name mapping

🗂️ View, filter, and export check-out records

✏️ Admin panel to manage users and equipment

🎨 FedEx-themed interface with modern UI


📦 How It Works

1. Scan or input an employee badge — displays their name.


2. Scan multiple equipment items — automatically links to display names.


3. Click "Check Out" — logs the entry with timestamp.


4. All records are saved in-browser — and can be exported to CSV.


5. Admins can add/remove employees and equipment as needed.



> 📝 No server or database required — works fully offline using local storage.



🛠 Technologies

HTML5, CSS3, JavaScript

Local Storage for record retention

Dynamic CSV export for records


📁 File Structure

index.html – Main app UI

localStorage – Used by browser to persist employee/equipment data

CSV Export – Output file on record export

🏁 Getting Started

### Prerequisites

- Modern desktop browser (Chrome, Firefox, Edge, etc.)
- Optional: USB or Bluetooth barcode scanner

### Run locally

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FECS.git
   cd FECS
   ```
2. Open `index.html` directly in your browser or serve the project with a simple local server:
   ```bash
   python -m http.server
   ```
   Then visit [http://localhost:8000](http://localhost:8000) in your browser.

🧑‍💼 Ideal For

FedEx Ground/Express operations teams

Dock supervisors managing shared tools

Sort managers tracking van equipment


📤 Data Management

Add/remove employees and equipment via the Admin panel.

All check-outs are timestamped and include employee and equipment details.

Download logs anytime in .csv format for recordkeeping.


🛡️ Disclaimer

This app is not an official FedEx product. It is a custom-built internal tool inspired by FedEx operational needs.

📄 License

MIT License
