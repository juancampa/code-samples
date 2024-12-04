// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.

import { state, root } from "membrane";


async function fetchCitiBikeStations(url) {
    const response = await fetch(url);
    const data = await response.json();
    const stations: Station[] = data.data.stations;
    return stations;
  }

function joinStationLists(list1, list2) {
  const stationMap = new Map<string, Station>();

  list1.forEach(station => {
      stationMap.set(station.station_id, station);
  });

  list2.forEach(station => {
      const existingStation = stationMap.get(station.station_id);
      if (existingStation) {
          stationMap.set(station.station_id, { ...existingStation, ...station });
      } else {
          stationMap.set(station.station_id, station);
      }
  });

  // Return the merged stations as an array
  return Array.from(stationMap.values());
}


export const Root = {
  stations: () => ({})
};

export const StationCollection = {
  async page() {
    const basic_info = await fetchCitiBikeStations('https://gbfs.citibikenyc.com/gbfs/en/station_information.json')
    const availability = await fetchCitiBikeStations('https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json')
    const all = joinStationLists(basic_info,availability);
    return {items:all};
  },
  async one({station_id}){
    const basic_info = await fetchCitiBikeStations('https://gbfs.citibikenyc.com/gbfs/en/station_information.json')
    const availability = await fetchCitiBikeStations('https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json')
    const all = joinStationLists(basic_info,availability);
    return all.find(station => station.station_id === station_id);
  }

}

export const Station = {
  gref: (_, { self, obj }) => {
    return root.stations.one({ station_id: obj.station_id });
  },
}