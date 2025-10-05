require([
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
], function (Map, MapView, SceneView, Graphic, GraphicsLayer) {
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
    zoom: 12,
    center: [106.66522107272267, 10.872924838210652],
  });

  // vẽ đa giác phường
  const drawWard = (data, currentRegion) => {
    if (data.city === currentRegion || currentRegion === "Cả nước") {
      return new Graphic({
        geometry: { type: "polygon", rings: data.rings },
        symbol: {
          type: "simple-fill",
          color: data.color,
          outline: {
            type: "simple-line",
            color: [255, 255, 255, 0.8], // màu biên giới phường
            width: 1.2, // độ dày biên giới
            style: "dash", // biên giới nét đứt
          },
        },
        attributes: data,
        popupTemplate: {
          title: "{title}",
          content:
            "<a>Diện tích: {area} km²<br>Dân số: {population} người <br>Mật độ: {population_density} người/km²</a>",
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
        color: useDataColors ? data.color : [128, 39, 245],
        width: 5,
      },
      attributes: { title: data.title, description: data.description },
      geometry: { type: "polyline", paths: data.paths },
      popupTemplate: {
        title: "{title}",
        content: "<a>{description}</a>",
      },
    });
  };

  // vẽ Point
  const drawPoint = (data) =>
    new Graphic({
      symbol: {
        type: "picture-marker",
        url: data.url,
        width: "30px",
        height: "30px",
      },
      geometry: { type: "point", x: data.paths[0], y: data.paths[1] },
      attributes: {
        ...data,
        // đảm bảo có các field sau:
        description: data.description ?? "",
        img1:
          data.img1 ??
          window.location.origin + "/images/vo_truong_toan_thpt.png",
      },
      popupTemplate: {
        title: "{title}",
        content: [
          {
            type: "media",
            mediaInfos: [
              {
                type: "image",
                caption: "{description}",
                value: { sourceURL: "{img1}" }, // chỉ tham chiếu TÊN field trong {}
              },
            ],
          },
        ],
      },
    });

  // tạo phân lớp đa giác
  const polygonsLayer = new GraphicsLayer();

  // tạo phân lớp đường
  const arcsLayer = new GraphicsLayer();

  // tạo phân lớp điểm
  const pointsLayer = new GraphicsLayer();

  //lấy dữ liệu tọa độ các tỉnh từ ./polygon/provinces/index.json
  function fetchProvinceData(currentRegion) {
    fetch("polygon/wards/ho_chi_minh/index.json")
      .then((res) => {
        return res.json();
      })
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/wards/ho_chi_minh/${file}`).then((res) => res.json())
          )
        )
      )
      .then((data) =>
        data.forEach((obj) =>
          // Thêm Phường vào phần đa giác
          {
            polygonsLayer.add(drawWard(obj, currentRegion));
          }
        )
      );
  }

  // lấy dữ liệu các đường đi từ ./polygon/roads/index.json
  function fetchRoadData(useDataColors, currentRegion) {
    fetch("polygon/roads/Ho_Chi_Minh/index.json")
      .then((res) => {
        return res.json();
      })
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/roads/Ho_Chi_Minh/${file}`).then((res) => res.json())
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

  // lấy dữ liệu các điểm nằm trong các phường của TP. Hồ Chí Minh từ ./point/Ho_Chi_Minh/index.json
  function fetchPointsData(currentRegion) {
    fetch("polygon/points/Ho_Chi_Minh/index.json")
      .then((res) => res.json())
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/points/Ho_Chi_Minh/${file}`).then((res) =>
              res.json()
            )
          )
        )
      )
      .then((data) =>
        data.forEach((obj) => {
          if (obj.region === currentRegion || currentRegion === "Cả nước") {
            // thêm điểm vào phân lớp điểm
            pointsLayer.add(drawPoint(obj));
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
  fetchPointsData(region);

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
    fetchPointsData(currentRegion);

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
