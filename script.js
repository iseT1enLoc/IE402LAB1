require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
], function (esriConfig, Map, MapView, SceneView, Graphic, GraphicsLayer) {
  // khởi tạo map
  const map = new Map({
    basemap: "dark-gray-vector",
  });

  // biến lưu giá trị camera (độ zoom, tọa độ, góc nhìn) cho view 3D
  let cameraPosition = {
    position: { longitude: 105.5474137, latitude: 4.0241589, z: 450000 },
    tilt: 55,
  };

  // hiển thị view 3D
  const sceneView = new SceneView({
    container: null,
    map: map,
    viewingMode: "global",
    camera: cameraPosition,
    qualityProfile: "high",
  });

  // hiển thị view 2D
  const mapView = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 5,
    center: [108.6208828, 15.6862363],
  });

  // vẽ đa giác tỉnh
  const drawProvince = (data, currentRegion) => {
    if (data.region === currentRegion || currentRegion === "Cả nước") {
      return new Graphic({
        geometry: { type: "polygon", rings: data.rings },
        symbol: {
          type: "simple-fill",
          color: data.color,
          outline: {
            type: "simple-line",
            color: [255, 255, 255], // màu biên giới tỉnh
            width: 1, // độ dày biên giới
            style: "dash", // biên giới nét đứt
          },
        },
        attributes: data,
        popupTemplate: {
          title: "{title}",
          content:
            "<a>Diện tích: {area} km²<br>Dân số: {population} người <br>Mật độ: {population_density} người/km²<br>Biển số xe: {plate_number}</a>",
        },
      });
    } else {
      return new Graphic({
        geometry: { type: "polygon", rings: data.rings },
        symbol: {
          type: "simple-fill",
          color: [120, 120, 120, 0.5],
          outline: {
            type: "simple-line",
            color: [255, 255, 255],
            width: 1,
            style: "dash",
          },
        },
      });
    }
  };

  // vẽ cung đường đi
  const drawRoad = (data, useDataColors) => {
    return new Graphic({
      symbol: {
        type: "simple-line",
        color: useDataColors ? data.color : [255, 180, 0],
        width: 2,
      },
      attributes: { description: data.description },
      popupTemplate: { title: "{description}" },
      geometry: { type: "polyline", paths: data.paths },
    });
  };

  // vẽ điểm thành phố
  const drawCity = (data) => {
    let img_url = "images/city.png";
    let img_width = "8px";
    let img_height = "8px";
    if (data.city_type === "Trực thuộc trung ương") {
      img_url = "images/major_city.png";
      img_width = "10px";
      img_height = "10px";
    } else if (data.city_type === "Thủ đô") {
      img_url = "images/capital.png";
      img_width = "18px";
      img_height = "18px";
    }
    return new Graphic({
      symbol: {
        type: "picture-marker",
        url: img_url,
        width: img_width,
        height: img_height,
      },
      geometry: { type: "point", ...data },
      attributes: data,
      popupTemplate: {
        title: "{title}",
        content: "<a>{city_type}<br>Dân số: {population} người</a>",
      },
    });
  };

  // vẽ điểm thị trấn
  const drawTown = (data) => {
    return new Graphic({
      symbol: {
        type: "picture-marker",
        url: "images/town.png",
        width: "6px",
        height: "6px",
      },
      geometry: { type: "point", ...data },
      attributes: data,
      popupTemplate: {
        title: "{title}",
      },
    });
  };

  // vẽ điểm cầu
  const drawBridge = (data) => {
    return new Graphic({
      symbol: {
        type: "picture-marker",
        url: "images/bridge.png",
        width: "20px",
        height: "20px",
      },

      geometry: { type: "point", ...data },
      attributes: data,
      popupTemplate: {
        title: "{title}",
        content: "<a>{description}</a>",
      },
    });
  };

  // tạo phân lớp đa giác
  const polygonsLayer = new GraphicsLayer();
  // tạo phân lớp cung
  const arcsLayer = new GraphicsLayer();
  // tạo phân lớp điểm
  const pointsLayer = new GraphicsLayer();

  // lấy dữ liệu tọa độ các tỉnh từ ./polygon/provinces/index.json
  function fetchProvinceData(currentRegion) {
    fetch("polygon/provinces/index.json")
      .then((res) => res.json())
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/provinces/${file}`).then((res) => res.json())
          )
        )
      )
      .then((data) =>
        data.forEach((obj) =>
          // thêm tỉnh vào phân lớp đa giác
          polygonsLayer.add(drawProvince(obj, currentRegion))
        )
      );
  }

  // lấy dữ liệu các đường đi từ ./polygon/roads/index.json
  function fetchRoadData(useDataColors, currentRegion) {
    fetch("polygon/roads/index.json")
      .then((res) => res.json())
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/roads/${file}`).then((res) => res.json())
          )
        )
      )
      .then((data) =>
        data.forEach((obj) => {
          if (obj.region === currentRegion || currentRegion === "Cả nước") {
            // thêm đường bộ vào phân lớp cung
            arcsLayer.add(drawRoad(obj, useDataColors));
          }
        })
      );
  }

  // lấy dữ liệu các điểm cầu đường bộ từ ./point/bridges.json
  function fetchBridgeData(currentRegion) {
    fetch("point/bridges.json")
      .then((res) => res.json())
      .then((data) =>
        data.forEach((obj) => {
          if (obj.region === currentRegion || currentRegion === "Cả nước") {
            // thêm cầu vào phân lớp điểm
            pointsLayer.add(drawBridge(obj));
          }
        })
      );
  }

  // lấy dữ liệu các điểm thành phố từ ./point/cities.json
  function fetchCityData(currentRegion) {
    fetch("point/cities.json")
      .then((res) => res.json())
      .then((data) =>
        data.forEach((obj) => {
          if (obj.region === currentRegion || currentRegion === "Cả nước") {
            // thêm thành phố vào phân lớp điểm
            pointsLayer.add(drawCity(obj));
          }
        })
      );
  }

  // lấy dữ liệu các điểm thị trấn từ ./point/towns.json
  function fetchTownData(currentRegion) {
    fetch("point/towns.json")
      .then((res) => res.json())
      .then((data) =>
        data.forEach((obj) => {
          if (obj.region === currentRegion || currentRegion === "Cả nước") {
            // thêm thị xã vào phân lớp điểm
            pointsLayer.add(drawTown(obj));
          }
        })
      );
  }

  // flag có dùng màu riêng cho từng đường bộ hay là không
  // mặc định = true (có)
  let useRoadColor = true;

  // khu vực hiện tại để hiển thị các thông tin địa lý (tỉnh, thành phố, cầu, đường)
  // mặc định = "Cả nước"
  let region = "Cả nước";

  // fetch data lần đầu
  fetchProvinceData(region);
  fetchRoadData(useRoadColor, region);
  fetchBridgeData(region);
  fetchCityData(region);
  fetchTownData(region);

  // thêm các lớp vào map để hiển thị trên bản đồ
  map.addMany([polygonsLayer, arcsLayer, pointsLayer]);

  // thực thi khi tick chọn hiển thị màu cho đường
  document
    .getElementById("toggleRoadColor")
    .addEventListener("change", function () {
      arcsLayer.removeAll(); // xóa lớp cung đường bộ để vẽ lại
      fetchRoadData(this.checked, region);
      useRoadColor = this.checked;
    });

  // hàm đổi khu vực hiển thị các thông tin địa lý
  window.changeDisplayRegion = function (currentRegion) {
    // xóa các lớp để vẽ mới lại
    polygonsLayer.removeAll();
    arcsLayer.removeAll();
    pointsLayer.removeAll();

    // thêm dữ liệu lại để vẽ mới
    fetchProvinceData(currentRegion);
    fetchRoadData(useRoadColor, currentRegion);
    fetchBridgeData(currentRegion);
    fetchCityData(currentRegion);
    fetchTownData(currentRegion);

    // ghi nhận lại region hiện tại
    region = currentRegion;
  };

  // xử lý event khi chuyển đổi 2D <-> 3D
  document.getElementById("toggleBtn").addEventListener("click", function () {
    if (mapView.container) {
      // đổi sang 3D
      mapView.container = null; // xóa view
      sceneView.container = "viewDiv"; // gán view mới
      sceneView.goTo(cameraPosition, { animate: false });
      this.innerText = "Đổi sang 2D";
    } else {
      //đổi sang 2D
      cameraPosition = sceneView.camera.clone();
      sceneView.container = null;
      mapView.container = "viewDiv";
      this.innerText = "Đổi sang 3D";
    }
  });

  // đổi basemap
  window.changeBasemap = function (basemap) {
    map.basemap = basemap;
  };
});