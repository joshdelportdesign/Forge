import Foundation
import EventKit

// Invoked only by the local Python server after the user chooses Connect / Add.
// EventKit expands recurring events and handles all-day events in the device calendar.
let store = EKEventStore()
let calendarTitle = "FORGE • CSWP 2026"
let iso = ISO8601DateFormatter()
let periodStart = iso.date(from: "2026-10-28T22:00:00Z")!
let periodEnd = iso.date(from: "2026-11-20T22:00:00Z")!

func emit(_ value: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]), let text = String(data: data, encoding: .utf8) { print(text) }
}

func permission() throws {
    var finished = false
    var granted = false
    var failure: Error?
    let completion: (Bool, Error?) -> Void = { allowed, error in
        DispatchQueue.main.async { granted = allowed; failure = error; finished = true }
    }
    if #available(macOS 14.0, *) {
        store.requestFullAccessToEvents(completion: completion)
    } else {
        store.requestAccess(to: .event, completion: completion)
    }
    let deadline = Date().addingTimeInterval(90)
    while !finished && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.05)) }
    if let failure = failure { throw failure }
    if !granted { throw NSError(domain: "FORGE", code: 1, userInfo: [NSLocalizedDescriptionKey: "Calendar access was not granted. Allow FORGE Calendar Bridge in System Settings → Privacy & Security → Calendars, then retry. You can also use the .ics export."]) }
}

func events() -> [EKEvent] {
    let predicate = store.predicateForEvents(withStart: periodStart, end: periodEnd, calendars: nil)
    return store.events(matching: predicate)
}

func marker(_ event: EKEvent) -> String? {
    guard event.calendar.title == calendarTitle, let notes = event.notes else { return nil }
    return notes.components(separatedBy: "\n").first(where: {$0.hasPrefix("FORGE-ID:")}).map { String($0.dropFirst(9)) }
}

do {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    guard let request = try JSONSerialization.jsonObject(with: input) as? [String: Any], let action = request["action"] as? String else {
        throw NSError(domain: "FORGE", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid local calendar request."])
    }
    try permission()
    let existing = events()
    if action == "read" {
        let intervals: [[String: Any]] = existing.filter { $0.status != .canceled && $0.availability != .free }.map {
            ["start": iso.string(from: $0.startDate), "end": iso.string(from: $0.endDate), "forge": marker($0) != nil]
        }
        emit(["events": intervals, "calendarCount": store.calendars(for: .event).count])
    } else if action == "write" {
        guard let sessions = request["sessions"] as? [[String: Any]], sessions.count <= 69 else {
            throw NSError(domain: "FORGE", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid session list."])
        }
        let target: EKCalendar
        if let found = store.calendars(for: .event).first(where: { $0.title == calendarTitle && $0.allowsContentModifications }) {
            target = found
        } else {
            target = EKCalendar(for: .event, eventStore: store)
            target.title = calendarTitle
            if let source = store.defaultCalendarForNewEvents?.source ?? store.sources.first(where: { $0.sourceType == .local || $0.sourceType == .calDAV }) {
                target.source = source
            } else {
                throw NSError(domain: "FORGE", code: 4, userInfo: [NSLocalizedDescriptionKey: "No writable Calendar account is available. Add an account in Apple Calendar or import the .ics file."])
            }
            try store.saveCalendar(target, commit: false)
        }
        let otherEvents = existing.filter { marker($0) == nil && $0.status != .canceled && $0.availability != .free }
        var saved = 0
        var skipped = 0
        for s in sessions {
            guard let id = s["id"] as? String, let startString = s["start"] as? String, let endString = s["end"] as? String, let title = s["title"] as? String, let description = s["description"] as? String else { continue }
            let parser = ISO8601DateFormatter()
            parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let start = parser.date(from: startString) ?? iso.date(from: startString), let end = parser.date(from: endString) ?? iso.date(from: endString), start >= Date(), end > start, start >= periodStart, end <= periodEnd else { skipped += 1; continue }
            if otherEvents.contains(where: { $0.startDate < end && $0.endDate > start }) { skipped += 1; continue }
            let event = existing.first(where: { marker($0) == id }) ?? EKEvent(eventStore: store)
            event.calendar = target
            event.title = "CSWP · " + title
            event.startDate = start
            event.endDate = end
            event.timeZone = TimeZone(identifier: "Africa/Johannesburg")
            event.notes = "FORGE-ID:" + id + "\n\n" + description
            event.alarms = [EKAlarm(relativeOffset: -600)]
            try store.save(event, span: .thisEvent, commit: false)
            saved += 1
        }
        try store.commit()
        emit(["saved": saved, "skipped": skipped, "calendar": calendarTitle])
    } else {
        throw NSError(domain: "FORGE", code: 5, userInfo: [NSLocalizedDescriptionKey: "Unknown calendar action."])
    }
} catch {
    store.reset()
    emit(["error": error.localizedDescription])
    exit(1)
}
