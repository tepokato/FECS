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

Data is stored in the browser's `localStorage`, and CSV files are generated at runtime when records are exported.

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

📖 Usage

### Checking Out Equipment
1. Open the application in your browser.
2. Scan or manually enter an employee badge to load their profile.
3. Scan each piece of equipment; items appear in the pending list.
4. Select **Check Out** to save the transaction with a timestamp.

### Returning Equipment
1. Scan the employee badge to view their checked-out gear.
2. Scan equipment being returned or remove it from the list.
3. Click **Return** to finalize the check-in.

### Admin Panel
- Access the Admin panel from the gear icon to add, edit, or remove employees and equipment.
- Changes are persisted in the browser's local storage and are available even when offline.

### CSV Import/Export
- Export the activity log as a CSV file from the records view.
- Import existing employee or equipment lists via CSV through the Admin panel.

### Record Filtering
- Use the search box to filter records by employee, equipment, or date.
- Filtering happens entirely in the browser for quick, offline lookups.

> FECS stores all data in your browser's local storage, enabling full offline use and automatic persistence between sessions.

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
