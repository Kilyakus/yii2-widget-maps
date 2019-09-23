<?php

namespace kilyakus\widget\maps;

use yii\web\AssetBundle;

class GoogleMapsAsset extends \yii\web\AssetBundle
{
    public $sourcePath = __DIR__ . '/assets';
    public $options = [];

    public function init()
    {
        $key = \kilyakus\modules\models\Setting::get('maps_api_key');
        $this->options = array_merge($this->options, array_filter([
            'key' => $key,
        ]));
        $this->js = [
            // '//maps.googleapis.com/maps/api/js?'. http_build_query($this->options), //&language=ru
            'markerclusterer_compiled.js',
            'googlemap.js',
        ];
        $this->css = [
            'googlemap.css',
        ];
        $this->depends = [
            'yii\web\YiiAsset',
        ];
    }
}