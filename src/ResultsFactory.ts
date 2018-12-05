import {AnyLeg, Journey, Stop, Transfer, Trip} from "./GTFS";

/**
 * Extracts journeys from the kConnections index.
 */
export class ResultsFactory {

  /**
   * Take the best result of each round for the given destination and turn it into a journey.
   */
  public getResults(kConnections: ConnectionIndex, destination: Stop): Journey[] {
    const results: Journey[] = [];

    for (const k of Object.keys(kConnections[destination])) {
      results.push({ legs: this.getJourneyLegs(kConnections, k, destination) });
    }

    return results;
  }

  /**
   * Iterator back through each connection and build up a series of legs to create the journey
   */
  private getJourneyLegs(kConnections: ConnectionIndex, k: string, finalDestination: Stop) {
    const legs: AnyLeg[] = [];

    for (let destination = finalDestination, i = parseInt(k, 10); i > 0; i--) {
      const connection = kConnections[destination][i];

      if (isTransfer(connection)) {
        legs.push(connection);

        destination = connection.origin;
      }
      else {
        const [trip, start, end] = connection;
        const stopTimes = trip.stopTimes.slice(start, end + 1);
        const origin = stopTimes[0].stop;

        legs.push({ stopTimes, origin, destination, trip });

        destination = origin;
      }
    }

    return legs.reverse();
  }

}

export type ConnectionIndex = Record<Stop, Record<number, [Trip, number, number] | Transfer>>;

function isTransfer(connection: [Trip, number, number] | Transfer): connection is Transfer {
  return (connection as Transfer).origin !== undefined;
}