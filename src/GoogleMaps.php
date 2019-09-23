<?php

namespace kilyakus\widget\maps;

use Yii;
use yii\base\InvalidConfigException;
use yii\base\Widget;
use yii\helpers\ArrayHelper;
use yii\helpers\Html;
use yii\helpers\Json;
use yii\web\View;
use kilyakus\modules\models\Setting;

class GoogleMaps extends Widget
{
    public $userLocation = [];
    public $userLocations = [];
    public $wrapperClass;
    public $wrapperHeight = '500px';
    public $googleMapsUrl = 'https://maps.googleapis.com/maps/api/js?';

    public $googleMapsUrlOptions = [];

    /* https://developers.google.com/maps/documentation/javascript/reference */
    public $googleMapsOptions = [];

    /**
     * Example listener for infowindow object:
     *
     * ```php
     * [
     *    [
     *       'object' => 'infowindow',
     *       'event' => 'domready',
     *       'handler' => (new \yii\web\JsExpression('function() {
     *              // your custom js code
     *        }'))
     *    ]
     * ]
     * ```
     */
    public $googleMapsListeners = [];

    public $infoWindowOptions = [];

    public $containerId = 'map_canvas';

    public $parent = '.field-item-locality_id';

    public $geocode = false;

    /**
     * @var bool render empty map, if userLocations is empty. Defaults to 'true'
     */
    public $renderEmptyMap = true;

    public $assets;

    protected $geocodeData = [];

    protected $locate;

    public $model;

    public $options = [];

    public function init()
    {
        parent::init();

        if (is_array($this->userLocations) === false) {
            Yii::$app->session->setFlash('danger', 'Widget' . (new \ReflectionClass(get_class($this)))->getShortName() . ': ' . Yii::t('easyii', 'The "userLocations" property must be of the type array'));
        }

        $this->googleMapsOptions = $this->getGoogleMapsOptions();
        $this->infoWindowOptions = $this->getInfoWindowOptions();
        $this->assets = $this->getAssets();
        $this->googleMapsUrlOptions = $this->getGoogleMapsUrlOptions();

        $this->registerAssets();
    }

    public function run()
    {
        if ((empty($this->userLocations) || empty($this->userLocation)) && $this->renderEmptyMap === false) {
            return;
        }
        
        echo Html::beginTag('div', ['id' => $this->getId(), 'class' => $this->wrapperClass, 'style' => "height: {$this->wrapperHeight}"]);
        echo Html::tag('div', '', ['id' => $this->containerId,'class' => 'gm-widget']);
        echo Html::endTag('div');


        parent::run();
    }

    protected function registerAssets()
    {
        $view = $this->getView();
        GoogleMapsAsset::register($view);
        $view->registerJsFile($this->getGoogleMapsApiUrl(), ['position' => View::POS_HEAD]);
        
        $options = [];
        $options = $this->getClientOptions();
        $options = Json::encode($options);
        $view->registerJs("googleMaps('$this->containerId').initModule($options);", \yii\web\View::POS_END, $this->containerId);
    }

    /**
     * Get place urls and htmlContent
     *
     * @return string
     */
    protected function getGeoCodeData()
    {
        $result = [];
        if($this->userLocation){
            $data = $this->userLocation;
            $result[] = [
                'title' => ArrayHelper::getValue($data['location'], 'title'),
                'country' => ArrayHelper::getValue($data['location'], 'country'),
                'city' => ArrayHelper::getValue($data['location'], 'city'),
                'address' => implode(',', ArrayHelper::getValue($data, 'location')),
                'latitude' => ArrayHelper::getValue($data['location'], 'latitude'),
                'longitude' => ArrayHelper::getValue($data['location'], 'longitude'),
                'icon' => ArrayHelper::getValue($data['location'], 'icon'),
                'htmlContent' => ArrayHelper::getValue($data, 'htmlContent'),
            ];
        }

        if(count($this->userLocations)){
            foreach ($this->userLocations as $data) {
                $result[] = [
                    'title' => ArrayHelper::getValue($data['location'], 'title'),
                    'country' => ArrayHelper::getValue($data['location'], 'country'),
                    'city' => ArrayHelper::getValue($data['location'], 'city'),
                    'address' => implode(',', ArrayHelper::getValue($data, 'location')),
                    'latitude' => ArrayHelper::getValue($data['location'], 'latitude'),
                    'longitude' => ArrayHelper::getValue($data['location'], 'longitude'),
                    'icon' => ArrayHelper::getValue($data['location'], 'icon'),
                    'htmlContent' => ArrayHelper::getValue($data, 'htmlContent'),
                ];
            }
        }

        return $result;
    }

    /**
     * Get google maps api url
     *
     * @return string
     */
    protected function getGoogleMapsApiUrl()
    {
        return $this->googleMapsUrl . http_build_query($this->googleMapsUrlOptions);
    }

    /**
     * Get google maps url options
     *
     * @return array
     */
    protected function getGoogleMapsUrlOptions()
    {
        if (isset(Yii::$app->params['googleMapsUrlOptions']) && empty($this->googleMapsUrlOptions)) {
            $this->googleMapsUrlOptions = Yii::$app->params['googleMapsUrlOptions'];
        }

        return ArrayHelper::merge([
            'v' => '3.exp',
            'key' => Setting::get('maps_api_key'),
            'libraries' => null,
            'language' => 'ru',
        ],
        $this->googleMapsUrlOptions);
    }

    /**
     * Get google maps options
     *
     * @return array
     */
    protected function getGoogleMapsOptions()
    {
        if (isset(Yii::$app->params['googleMapsOptions']) && empty($this->googleMapsOptions)) {
            $this->googleMapsOptions = Yii::$app->params['googleMapsOptions'];
        }

        return ArrayHelper::merge([
            'mapTypeId' => 'hybrid',
            'tilt' => 45,
            'zoom' => 2,
        ], $this->googleMapsOptions);
    }

    /**
     * Get info window options
     *
     * @return array
     */
    protected function getInfoWindowOptions()
    {
        if (isset(Yii::$app->params['infoWindowOptions']) && empty($this->infoWindowOptions)) {
            $this->infoWindowOptions = Yii::$app->params['infoWindowOptions'];
        }

        return ArrayHelper::merge([
            'content' => '',
            'maxWidth' => 350,
        ], $this->infoWindowOptions);
    }

    protected function getAssets()
    {
        return GoogleMapsAsset::register(Yii::$app->view)->baseUrl;
    }

    /**
     * Get google map client options
     *
     * @return string
     */
    protected function getClientOptions()
    {
        $this->options = [
            'geocodeData' => $this->getGeoCodeData(),
            'mapOptions' => $this->googleMapsOptions,
            'listeners' => $this->googleMapsListeners,
            'containerId' => $this->containerId,
            'parent' => $this->parent,
            'id' => $this->model->primaryKey,
            'geocode' => $this->geocode,
            'renderEmptyMap' => $this->renderEmptyMap,
            'infoWindowOptions' => $this->infoWindowOptions,
            'baseUrl' => $this->assets,
        ];

        return $this->options;
    }
}
