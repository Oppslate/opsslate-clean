import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const projectPage = readFileSync(join(root, "src/app/project/[id]/page.tsx"), "utf8");

assert.ok(projectPage.includes("useMutation"), "project detail page should use a mutation to save edits");
assert.ok(projectPage.includes("api.projects.update"), "project detail edits should save through the projects.update mutation");
assert.ok(projectPage.includes("api.weather.geocodeAndSave"), "project weather should geocode saved addresses");
assert.ok(projectPage.includes("geocodeProjectAddress"), "project weather should trigger geocoding from the project page");
assert.ok(projectPage.includes("addressForWeather"), "project weather should use the project address when coordinates are missing");
assert.ok(projectPage.includes("project.address || project.location"), "project weather should geocode legacy project location values");
assert.ok(projectPage.includes("clientGeocodeProjectAddress"), "project weather should fall back to browser geocoding when backend geocoding is unavailable");
assert.ok(projectPage.includes("nominatim.openstreetmap.org/search"), "project weather should use an address geocoder before requesting weather");
assert.ok(projectPage.includes("latitude, longitude"), "project weather should save geocoded coordinates for the project");
assert.ok(projectPage.includes("Edit Project Details"), "project details card should expose an edit button/dialog");
assert.ok(projectPage.includes("handleSaveProjectDetails"), "project details dialog should have a save handler");
assert.ok(projectPage.includes("Project manager"), "project details edit form should include project manager input");
assert.ok(projectPage.includes("Contract value"), "project details edit form should include contract value input");
assert.ok(projectPage.includes("<select"), "project status should use a dropdown control");
assert.ok(!projectPage.includes('<Input id="project-status"'), "project status should not be a free-text input");
for (const status of ["Active", "Bid", "On Hold", "Complete"]) {
  assert.ok(projectPage.includes(`"${status}"`), `project status dropdown should include ${status}`);
}
assert.ok(projectPage.includes("generateProjectCode"), "project details should generate a YY-##### project code");
assert.ok(projectPage.includes("PROJECT_CODE_STORAGE_KEY"), "project generated codes should be tracked for local uniqueness");
assert.ok(projectPage.includes("ProjectDetailSelectField"), "project details should use reusable dropdown controls");
assert.ok(projectPage.includes("PROJECT_DETAIL_DROPDOWN_STORAGE_KEY"), "project dropdown custom values should be stored for reuse");
assert.ok(projectPage.includes("__other__"), "project dropdowns should support an Other custom entry");
for (const field of ["contractor", "projectRole", "type", "status"]) {
  assert.ok(projectPage.includes(`updateProjectDetailsDropdown("${field}"`), `${field} should use the dropdown/custom-entry rule`);
}
assert.ok(projectPage.includes("bidDateTime"), "project details should track bid date and time");
assert.ok(projectPage.includes('id="project-bid-date-time"'), "Bid status should request a bid date and time");
assert.ok(projectPage.includes('type="datetime-local"'), "Bid date and time should use a datetime input");
assert.ok(projectPage.includes("ProjectDetailDatePickerField"), "project date inputs should use the date picker field");
assert.ok(projectPage.includes("input.showPicker"), "project date picker should open the native browser date picker");
assert.ok(projectPage.includes("CalendarDays"), "project date picker should expose a visible calendar button");
assert.ok(projectPage.includes('projectDetailsForm.status === "Bid"'), "Bid date/time input should only appear for Bid status");
assert.ok(projectPage.includes("Bid date and time is required when status is Bid."), "Bid status should require a bid date/time before save");
assert.ok(projectPage.includes("Bid Date/Time"), "project details view should show the saved bid date/time");
assert.ok(projectPage.includes("contractDate: projectDetailsForm.status === \"Bid\""), "Bid date/time should save through the existing project contractDate field");
assert.ok(projectPage.includes("Project Team Members"), "project page should include a project team members card");
assert.ok(projectPage.includes("api.contacts.list"), "project team members card should load project contacts");
assert.ok(projectPage.includes("api.contacts.create"), "project team members card should save new project contacts");
assert.ok(projectPage.includes("api.contacts.update"), "project team members card should edit existing project contacts");
assert.ok(projectPage.includes("api.contacts.remove"), "project team members card should delete project contacts");
for (const action of ["Edit", "Delete", "Text location", "Send email", "Invite to Bid"]) {
  assert.ok(projectPage.includes(action), `project team member card should include ${action} action`);
}
assert.ok(projectPage.includes("handleInviteToBid"), "project team member card should send bid invitations through a handler");
assert.ok(projectPage.includes("bidInvitationSendingId"), "project team member card should show bid invitation sending state");
assert.ok(projectPage.includes("Invitation to Bid"), "project team member bid invitation should use an invitation to bid subject/body");
assert.ok(projectPage.includes("sendEmail({"), "project team member bid invitation should send through the email action");
assert.ok(projectPage.includes("sms:"), "project team member card should send project location by text message");
assert.ok(projectPage.includes("handleTextProjectLocation"), "project team member text action should use a click handler with fallback behavior");
assert.ok(projectPage.includes("navigator.clipboard.writeText(projectLocationMessage)"), "project team member text action should copy the location message before opening SMS");
assert.ok(projectPage.includes('replace(/[^\\d+]/g, "")'), "project team member text action should clean phone numbers for SMS links");
assert.ok(projectPage.includes("?body="), "project team member text action should use the standard SMS body parameter");
assert.ok(projectPage.includes("mailto:"), "project team member card should send project location by email");
assert.ok(projectPage.includes("projectLocationMessage"), "project team member messages should include the project location");
for (const label of ["First name", "Last name", "Company", "Contact phone Number", "Email address"]) {
  assert.ok(projectPage.includes(label), `project team member form should include ${label}`);
}

const projectDetailsIndex = projectPage.indexOf("Project Details");
const weatherIndex = projectPage.indexOf("PM Weather Monitor");
assert.ok(projectDetailsIndex > -1, "project details card should exist");
assert.ok(weatherIndex > -1, "weather monitor card should exist");
assert.ok(projectDetailsIndex < weatherIndex, "project details card should render above the weather card");
assert.ok(!projectPage.includes('lg:col-span-2">\r\n          <CardContent className="p-4">\r\n            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">\r\n              <div>\r\n                <h3 className="font-bold text-sm">Project Details'), "project details card should not be constrained to half-width on desktop");
