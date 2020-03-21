/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text, PermissionsAndroid} from 'react-native';

import SmsListener from 'react-native-android-sms-listener2';
import {getUniqueId} from 'react-native-device-info';
import QRCode from 'react-native-qrcode-svg';

import axios from 'axios';

axios.defaults.baseURL = 'https://service.wx.hengkx.com';

axios.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error.response.data),
);

async function requestReadSmsPermission() {
  try {
    var granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: '阅读短信',
        message: '需要获取阅读短信权限',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        {
          title: '接收短信',
          message: '需要获取接收短信权限',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('RECEIVE_SMS permissions granted', granted);
      } else {
        console.log('RECEIVE_SMS permissions denied');
      }
    } else {
      console.log('sms read permissions denied');
    }
  } catch (err) {
    console.log(err);
  }
}
const App: () => React$Node = () => {
  const [url, setUrl] = useState();
  const [openId, setOpenId] = useState();
  useEffect(() => {
    requestReadSmsPermission();
    axios
      .get('/api/account/info', {params: {deviceId: getUniqueId()}})
      .then(res => {
        console.log(res);
        if (res.code === 0) {
          if (res.data.url) {
            setUrl(res.data.url);
            const interval = setInterval(async () => {
              const {data} = await axios.get('/api/account/check', {
                params: {deviceId: getUniqueId()},
              });
              if (data) {
                setUrl();
                setOpenId(data.openId);
                clearInterval(interval);
              }
            }, 1000);
          } else {
            setOpenId(res.data.openId);
          }
        }
      });
    SmsListener.addListener(message => {
      if (openId) {
        axios.post('/api/sms/receive', {
          ...message,
          openId,
          tel: message.originatingAddress,
          content: message.body,
        });
      }
    });
  }, [openId, setUrl]);

  return (
    <>
      <View style={styles.qrCodeContainer}>
        {url && (
          <>
            <QRCode value={url} size={200} bgColor="purple" fgColor="white" />
            <Text style={styles.qrCodeTip}>微信扫描二维码绑定</Text>
          </>
        )}
        {openId && <Text>已为您自动开启短信转发</Text>}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  qrCodeContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  qrCodeTip: {
    marginTop: 10,
  },
});

export default App;
