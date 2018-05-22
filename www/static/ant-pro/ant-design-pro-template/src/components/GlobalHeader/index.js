import React, {PureComponent} from 'react';
import {
    Layout,
    Menu,
    Icon,
    Spin,
    Tag,
    Dropdown,
    Avatar,
    Divider,
    Tooltip
} from 'antd';
import Ellipsis from '../Ellipsis';
import moment from 'moment';
import groupBy from 'lodash/groupBy';
import Debounce from 'lodash-decorators/debounce';
import {Link} from 'dva/router';
import NoticeIcon from '../NoticeIcon';
import HeaderSearch from '../HeaderSearch';
import styles from './index.less';
import cookie from '../../utils/cookie';
import userIcon from '../../../public/images/user-icon-small.png';
import ScrollerX from '../../components/ScrollerX';
import teamUtil from '../../utils/team';

const {Header} = Layout;

export default class GlobalHeader extends PureComponent {
    constructor(props){
        super(props);
        this.state = {
            noticeCount:0,
            noticeData:[],
            total: 0,
			pageSize: 5
        }
      }
    componentWillUnmount() {
        this
            .triggerResizeEvent
            .cancel();
    }
    getNoticeData() {
        const {
            notices = []
        } = this.props;
        if (notices.length === 0) {
            return {};
        }
        const newNotices = notices.map((notice) => {
            const newNotice = {
                ...notice
            };
            if (newNotice.datetime) {
                newNotice.datetime = moment(notice.datetime).fromNow();
            }
            // transform id to item key
            if (newNotice.id) {
                newNotice.key = newNotice.id;
            }
            if (newNotice.extra && newNotice.status) {
                const color = ({todo: '', processing: 'blue', urgent: 'red', doing: 'gold'})[newNotice.status];
                newNotice.extra = <Tag
                    color={color}
                    style={{
                    marginRight: 0
                }}>{newNotice.extra}</Tag>;
            }
            return newNotice;
        });
        return groupBy(newNotices, 'type');
    }
    toggle = () => {
        const {collapsed, onCollapse} = this.props;
        onCollapse(!collapsed);
        this.triggerResizeEvent();
    }
    @Debounce(600)
    triggerResizeEvent() { // eslint-disable-line
        const event = document.createEvent('HTMLEvents');
        event.initEvent('resize', true, false);
        window.dispatchEvent(event);
    }
    renderTeams = () => {
        const onTeamClick = this.props.onTeamClick;
        const {currTeam} = this.props;
        const currentUser = this.props.currentUser;
        const teams = currentUser.teams || [];
        const team = teams.filter((item) => {
            item.team_name === currTeam;
        })

        return <Menu className={styles.menu} selectedKeys={[]} onClick={onTeamClick}>
            {teams.map((item) => {
                return (
                    <Menu.Item key={item.team_name}>
                        <Ellipsis tooltip>{item.team_alias}</Ellipsis>
                    </Menu.Item>
                )
            })
}
            <Menu.Divider/>
            {currentUser.is_user_enter_amdin && <Menu.Item key={'createTeam'}><Icon type="plus"/>新建团队</Menu.Item>}
        </Menu>
    }
    getCurrTeam = () => {
        const currTeam = this.props.currTeam;
        const currentUser = this.props.currentUser;
        const teams = currentUser.teams || [];
        return teams.filter((item) => {
            return item.team_name === currTeam;
        })[0]
    }
    renderRegions = () => {
        const onRegionClick = this.props.onRegionClick;
        const team = this.getCurrTeam();
        if (team) {
            return <Menu className={styles.menu} selectedKeys={[]} onClick={onRegionClick}>
                {(team.region || []).map((item) => {
                    return (
                        <Menu.Item key={item.team_region_name}>{item.team_region_alias}</Menu.Item>
                    )
                })
}
                <Menu.Divider/>
                {teamUtil.canAddRegion(team) && <Menu.Item key={'openRegion'}><Icon type="plus"/>开通数据中心</Menu.Item>}
            </Menu>
        }
        return <Menu/>;
    }
    getCurrTeamTit() {
        var team = this.getCurrTeam();
        if (team) {
            return team.team_alias;
        }
        return ''
    }
    getCurrRegionTit() {
        const {currRegion} = this.props;
        var team = this.getCurrTeam();
        if (team) {
            var regions = team.region;
            var selectedRegion = regions.filter((item) => {
                return item.team_region_name === currRegion;
            })[0]
            if (selectedRegion) {
                return selectedRegion.team_region_alias;
            }
        }

        return ''
    }
    render() {
        const {
            currentUser,
            collapsed,
            fetchingNotices,
            isMobile,
            logo,
            onNoticeVisibleChange,
            onMenuClick,
            onNoticeClear,
            notifyCount,
            isPubCloud,
            currRegion,
            currTeam
        } = this.props;

        if (!currentUser) {
            return null
        }

        const menu = (
            <Menu selectedKeys={[]} onClick={onMenuClick}>
                {/*<Menu.Item disabled><Icon type="user" />个人中心</Menu.Item>
        <Menu.Item disabled><Icon type="setting" />设置</Menu.Item>
        <Menu.Item key="triggerError"><Icon type="close-circle" />触发报错</Menu.Item>
        <Menu.Divider />*/}
                {!isPubCloud &&< Menu.Item key = "cpw" > <Icon
                    type="edit"
                    style={{
                    marginRight: 8
                }}/>修改密码 < /Menu.Item>}
                <Menu.Item key="logout"><Icon type="logout" style={{
                marginRight: 8
            }}/>退出登录</Menu.Item>
            </Menu>
        );

        const noticeData = this.getNoticeData();
        return (
            <Header className={styles.header}>
                {isMobile && ([
                    (
                        <Link
                            to="/"
                            className={styles.logo}
                            key="logo"
                            width="40"
                            style={{
                            width: '65px',
                            display: 'inline-block',
                            overflow: 'hidden'
                        }}>
                            <img src={logo} alt="logo"/>
                        </Link>
                    ), < Divider type = "vertical" key = "line" />
                ])}
                <Icon
                    className={styles.trigger}
                    type={collapsed
                    ? 'menu-unfold'
                    : 'menu-fold'}
                    onClick={this.toggle}/>

                <div className={styles.teamregion}>

                    <span className={styles.tit}>团队:</span>
                    <Dropdown overlay={this.renderTeams()}>
                        <a className={styles.dropdown}>
                            <span className={styles.smShow}>团队</span>
                            <span className={styles.smHidden}>
                                {this.getCurrTeamTit()
}
                                <Icon type="down"/>
                            </span>
                        </a>
                    </Dropdown>
                    <Divider
                        type="vertical"
                        style={{
                        margin: '0 20px 0 20px'
                    }}/>
                    <span className={styles.tit}>数据中心:</span>
                    <Dropdown overlay={this.renderRegions()}>
                        <a className={styles.dropdown}>
                            <span className={styles.smShow}>数据中心</span>
                            <span className={styles.smHidden}>
                                {this.getCurrRegionTit()
}
                                <Icon type="down"/>
                            </span>
                        </a>
                    </Dropdown>
                </div>

                <div className={styles.right}>
                    <Tooltip title="使用文档">
                        <a
                            target="_blank"
                            href="https://www.rainbond.com/docs/stable/user-app-docs/how-to-use-app.html"
                            rel="noopener noreferrer"
                            className={styles.action}>
                            <Icon type="question-circle-o"/>
                        </a >
                    </Tooltip>
                    {/*
          <HeaderSearch
            className={`${styles.action} ${styles.search}`}
            placeholder="站内搜索"
            dataSource={['搜索提示一', '搜索提示二', '搜索提示三']}
            onSearch={(value) => {
              console.log('input', value); // eslint-disable-line
            }}
            onPressEnter={(value) => {
              console.log('enter', value); // eslint-disable-line
            }}
          /> */}

           <NoticeIcon count={5} className="notice-icon">
                <NoticeIcon.Tab
                    title="公告"
                    emptyText="你已查看所有公告"
                    emptyImage="https://gw.alipayobjects.com/zos/rmsportal/wAhyIChODzsoKIOBHcBk.svg"
                />
                <NoticeIcon.Tab
                    title="消息"
                    emptyText="你已查看所有消息"
                    emptyImage="https://gw.alipayobjects.com/zos/rmsportal/sAuJeJzSKbUmHfBQRzmZ.svg"
                />
                <NoticeIcon.Tab
                    title="提醒"
                    emptyText="你已查看所有提醒"
                    emptyImage="https://gw.alipayobjects.com/zos/rmsportal/HsIsxMZiWKrNUavQUXqx.svg"
                />
            </NoticeIcon>
          
     
       
                    {currentUser
                        ? (
                            <Dropdown overlay={menu}>
                                <span className={`${styles.action} ${styles.account}`}>
                                    <Avatar size="small" className={styles.avatar} src={userIcon}/>
                                    <span className={styles.name}>{currentUser.user_name}</span>
                                </span>
                            </Dropdown>
                        )
                        : <Spin
                            size="small"
                            style={{
                            marginLeft: 8
                        }}/>}
                </div>
            </Header>
        );
    }
}
