require([
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
], function (Map, MapView, SceneView, Graphic, GraphicsLayer) {
  // khởi tạo map
  const map = new Map({
    basemap: "streets-navigation-vector",
  });



  // hiển thị view 2D
  const mapView = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 13,
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
        color: useDataColors ? data.color : [217, 212, 212],
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
        width: "50px",
        height: "50px",
      },
      geometry: { type: "point", x: data.paths[0], y: data.paths[1] },
      attributes: {
        ...data,
        description: data.description ?? "",
        image: data.image ?? "",
      },
      popupTemplate: {
        title: "{title}",
        content: [
          {
            type: "text",
            text: `<div style="font-size:18px;font-weight:600;line-height:1.3;">
               {description}
             </div>`,
          },
          {
            type: "media",
            mediaInfos: [
              {
                type: "image",
                value: { sourceURL: "{image}" },
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

  //lấy dữ liệu tọa độ các phường từ ./polygon/wards/ho_chi_minh/index.json
  function fetchWardData(currentRegion) {
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

  // lấy dữ liệu các đường đi từ ./polygon/roads/Ho_Chi_Minh/index.json
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
  fetchWardData(region);
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

  // đổi basemap
  window.changeBasemap = function (basemap) {
    map.basemap = basemap;
  };
});
