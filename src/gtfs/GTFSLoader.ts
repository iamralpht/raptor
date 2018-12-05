import * as gtfs from "gtfs-stream";
import * as fs from "fs";
import {Calendar, Trip} from "./GTFS";
import {Interchange, TransfersByOrigin} from "../raptor/RaptorAlgorithm";
import {pushNested, setNested} from "ts-array-utils";

export function loadGTFS(filename: string): Promise<[Trip[], TransfersByOrigin, Interchange, Calendar[]]> {
  const trips: Trip[] = [];
  const transfers = {};
  const interchange = {};
  const calendars: Calendar[] = [];
  const excludes = {};
  const includes = {};
  const stopTimes = {};

  const processor = {
    link: row => {
      const t = {
        origin: row.from_stop_id,
        destination: row.to_stop_id,
        duration: parseInt(row.duration, 10),
        startTime: getTime(row.start_time),
        endTime: getTime(row.end_time)
      };

      pushNested(t, transfers, row.from_stop_id);
    },
    calendar: row => {
      const cal = {
        serviceId: row.service_id,
        startDate: parseInt(row.start_date, 10),
        endDate: parseInt(row.end_date, 10),
        days: {
          0: row.sunday === "1",
          1: row.monday === "1",
          2: row.tuesday === "1",
          3: row.wednesday === "1",
          4: row.thursday === "1",
          5: row.friday === "1",
          6: row.saturday === "1"
        },
        include: {},
        exclude: {}
      };

      calendars.push(cal);
    },
    calendar_date: row => {
      const index = row.exception_type === "2" ? excludes : includes;

      setNested(true, index, row.service_id, row.date);
    },
    trip: row => {
      trips.push({ serviceId: row.service_id, tripId: row.trip_id, stopTimes: [] });
    },
    stop_time: row => {
      const stopTime = {
        stop: row.stop_id,
        departureTime: getTime(row.departure_time),
        arrivalTime: getTime(row.departure_time),
        pickUp: row.pickup_type === "0",
        dropOff: row.drop_off_type === "0"
      };

      stopTimes[row.trip_id] = stopTimes[row.trip_id] || [];
      stopTimes[row.trip_id].push(stopTime);
    },
    transfer: row => {
      interchange[row.from_stop_id] = parseInt(row.min_transfer_time, 10);
    },
    route: () => {},
    stop: () => {},
    agency: () => {},
  };

  return new Promise(resolve => {
    fs.createReadStream(filename)
      .pipe(gtfs())
      .on("data", entity => processor[entity.type](entity.data))
      .on("end", () => {
        for (const t of trips) {
          t.stopTimes = stopTimes[t.tripId];
        }

        for (const c of calendars) {
          c.exclude = excludes[c.serviceId] || {};
          c.include = includes[c.serviceId] || {};
        }

        resolve([trips, transfers, interchange, calendars]);
      });
  });

}

function getTime(time: string) {
  const a = time.split(":");

  return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
}